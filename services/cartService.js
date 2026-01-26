const { v4: uuidV4 } = require('uuid');
const {
  cart: CartModel,
  user: UserModel,
  product: ProductModel,
  productVariant: ProductVariantModel,
  productImage: ProductImageModel,
  branch: BranchModel,
  sequelize,
} = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const {
  ValidationError,
  NotFoundError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');
const { COMBO_DISCOUNT_TYPE } = require('../utils/constants/comboDiscountTypeConstants');
const { variantComboDiscount: VariantComboDiscountModel, Sequelize: { Op } } = require('../database');

// Helper: Get active combo discount for a variant at current date
const getActiveComboDiscountForVariant = async (variantId, transaction = null) => {
  const currentDate = new Date();

  const options = {
    where: {
      variant_id: variantId,
      status: 'ACTIVE',
      start_date: { [Op.lte]: currentDate },
      end_date: { [Op.gte]: currentDate },
    },
    attributes: [
      'id',
      'variant_id',
      'combo_quantity',
      'discount_type',
      'discount_value',
      'start_date',
      'end_date',
    ],
  };

  if (transaction) {
    options.transaction = transaction;
  }

  const comboDiscount = await VariantComboDiscountModel.findOne(options);

  return comboDiscount;
};

const saveCart = async (data) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy, productId, variantId, vendorId, branchId, price, isCombo, quantity, ...datas
  } = data;

  // Validate: Both productId and variantId are required
  if (!productId) {
    throw new ValidationError('productId is required');
  }

  if (!variantId) {
    throw new ValidationError('variantId is required');
  }

  if (!price) {
    throw new ValidationError('price is required');
  }

  if (typeof isCombo !== 'boolean') {
    throw new ValidationError('isCombo is required and must be a boolean');
  }

  // Get variant and validate it belongs to the product
  const variant = await ProductVariantModel.findOne({
    where: { id: variantId, product_id: productId },
    attributes: [ 'id', 'product_id', 'selling_price' ],
    include: [
      {
        model: ProductModel,
        as: 'product',
        attributes: [ 'id', 'vendor_id', 'branch_id' ],
      },
    ],
    transaction,
  });

  if (!variant) {
    throw new NotFoundError('Product variant not found or does not belong to the specified product');
  }

  const finalProductId = variant.product_id;
  const finalVendorId = variant.product.vendor_id;
  const finalBranchId = variant.product.branch_id;
  const finalVariantId = variantId;
  const sellingPrice = variant.selling_price;

  // Validate provided productId matches variant's product
  if (productId !== finalProductId) {
    throw new ValidationError('Product ID does not match the variant\'s product');
  }

  // Validate that provided vendorId and branchId match (if provided)
  if (vendorId && vendorId !== finalVendorId) {
    throw new ValidationError('Vendor ID does not match');
  }

  if (branchId && branchId !== finalBranchId) {
    throw new ValidationError('Branch ID does not match');
  }

  // Validate branch exists and belongs to vendor
  const branch = await BranchModel.findOne({
    where: { id: finalBranchId, vendor_id: finalVendorId },
    attributes: [ 'id' ],
    transaction,
  });

  if (!branch) {
    throw new ValidationError('Branch not found or does not belong to vendor');
  }

  // Calculate and validate price based on isCombo flag
  let unitPrice;
  let totalPrice;

  if (isCombo) {
    // Validate combo discount exists and quantity matches
    const comboDiscount = await getActiveComboDiscountForVariant(
      variantId,
      transaction,
    );

    if (!comboDiscount) {
      throw new ValidationError('No active combo discount found for this variant');
    }

    if (quantity !== comboDiscount.combo_quantity) {
      throw new ValidationError(`Quantity must be exactly ${comboDiscount.combo_quantity} for combo discount`);
    }

    // Calculate total combo price: (quantity * unit_price) - combo_discount
    const totalBeforeDiscount = sellingPrice * quantity;
    let expectedTotalComboPrice;

    if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.PERCENT) {
      // PERCENT: Apply percentage discount to total
      expectedTotalComboPrice = Math.round(totalBeforeDiscount * (1 - comboDiscount.discount_value / 100));
    } else if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.FLATOFF) {
      // FLATOFF: Subtract flat discount from total
      expectedTotalComboPrice = Math.round(totalBeforeDiscount - comboDiscount.discount_value);

      // Ensure price doesn't go negative
      if (expectedTotalComboPrice < 0) {
        expectedTotalComboPrice = 0;
      }
    } else {
      throw new ValidationError(`Invalid discount type. Must be ${COMBO_DISCOUNT_TYPE.PERCENT} or ${COMBO_DISCOUNT_TYPE.FLATOFF}`);
    }

    // Validate sent price matches expected total combo price
    if (price !== expectedTotalComboPrice) {
      throw new ValidationError(`Price must be ₹${expectedTotalComboPrice} for combo discount (total for ${quantity} items)`);
    }

    // For combo items: treat as single unit, unitPrice = totalPrice (combo price)
    totalPrice = price;
    unitPrice = price; // Combo products are treated as single unit
  } else {
    // For regular items: price should be total price (quantity × unit_price)
    const expectedTotalPrice = sellingPrice * quantity;

    if (price !== expectedTotalPrice) {
      throw new ValidationError(`Price must be ₹${expectedTotalPrice} for regular pricing (${quantity} × ₹${sellingPrice})`);
    }
    unitPrice = sellingPrice;
    totalPrice = price;
  }

  const concurrencyStamp = uuidV4();

  // Check if cart item already exists (same product/variant, user, vendor, branch, is_combo)
  const existingWhere = {
    created_by: createdBy,
    vendor_id: finalVendorId,
    branch_id: finalBranchId,
    product_id: finalProductId,
    variant_id: finalVariantId,
    is_combo: isCombo,
  };

  const isExists = await CartModel.findOne({
    where: existingWhere,
    attributes: [ 'id', 'product_id', 'variant_id', 'quantity' ],
    transaction,
  });

  if (isExists) {
    return { isexists: isExists };
  }

  const doc = {
    ...datas,
    productId: finalProductId,
    variantId: finalVariantId,
    vendorId: finalVendorId,
    branchId: finalBranchId,
    quantity,
    isCombo,
    unitPrice,
    totalPrice,
    concurrencyStamp,
    createdBy,
  };

  const cat = await CartModel.create(convertCamelToSnake(doc), {
    transaction,
  });

  return { doc: { cat } };
}).catch((error) => handleServiceError(error, 'Failed to save cart'));

const getCartOfUser = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting, vendorId, branchId,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);

  // Add vendorId and branchId filters if provided
  if (vendorId) {
    where.vendor_id = vendorId;
  }
  if (branchId) {
    where.branch_id = branchId;
  }

  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    CartModel,
    {
      where: { ...where, status: 'ACTIVE' },
      attributes: [ 'id', 'product_id', 'variant_id', 'vendor_id', 'branch_id', 'quantity', 'is_combo', 'unit_price', 'total_price', 'status', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
      include: [
        {
          model: ProductModel,
          as: 'productDetails',
          attributes: [ 'id', 'title' ],
          required: false,
        },
        {
          model: ProductVariantModel,
          as: 'variant',
          attributes: [ 'id', 'variant_name', 'selling_price', 'quantity', 'product_status' ],
          required: false,
          include: [
            {
              model: ProductModel,
              as: 'product',
              attributes: [ 'id', 'title' ],
              include: [
                {
                  model: ProductImageModel,
                  as: 'images',
                  where: { status: 'ACTIVE', is_default: 1 },
                  required: false,
                  attributes: [ 'id', 'image_url' ],
                  limit: 1,
                },
              ],
            },
          ],
        },
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'email', 'mobile_number' ],
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    },
  );
  const doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const deleteCart = async (cartId) => {
  try {
    await CartModel.destroy({
      where: { id: cartId },
    });

    return { doc: { message: 'successfully deleted cart' } };
  } catch (error) {
    return handleServiceError(error, 'Failed to delete cart');
  }
};

const updateCart = async (data) => withTransaction(sequelize, async (transaction) => {
  const {
    id, quantity, price, isCombo, ...datas
  } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await CartModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'variant_id', 'is_combo', 'unit_price', 'quantity' ],
    include: [
      {
        model: ProductVariantModel,
        as: 'variant',
        attributes: [ 'id', 'selling_price' ],
      },
    ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Cart item not found');
  }

  if (quantity === 0) {
    await CartModel.destroy({
      where: { id },
      transaction,
    });

    return { cartZero: 'item removed from cart' };
  }

  const {
    concurrency_stamp: stamp, variant_id: variantId, is_combo: currentIsCombo, unit_price: currentUnitPrice,
  } = response;
  const { variant } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  // Determine if we need to recalculate prices
  const newIsCombo = isCombo !== undefined ? isCombo : currentIsCombo;
  const newQuantity = quantity !== undefined ? quantity : response.quantity;
  const sellingPrice = variant.selling_price;

  let unitPrice;
  let totalPrice;

  // If price or isCombo is being updated, validate
  if (price !== undefined || isCombo !== undefined) {
    if (newIsCombo) {
      // Validate combo discount exists and quantity matches
      const comboDiscount = await getActiveComboDiscountForVariant(
        variantId,
        transaction,
      );

      if (!comboDiscount) {
        throw new ValidationError('No active combo discount found for this variant');
      }

      if (newQuantity !== comboDiscount.combo_quantity) {
        throw new ValidationError(`Quantity must be exactly ${comboDiscount.combo_quantity} for combo discount`);
      }

      // Calculate total combo price: (quantity * unit_price) - combo_discount
      const totalBeforeDiscount = sellingPrice * newQuantity;
      let expectedTotalComboPrice;

      if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.PERCENT) {
        // PERCENT: Apply percentage discount to total
        expectedTotalComboPrice = Math.round(totalBeforeDiscount * (1 - comboDiscount.discount_value / 100));
      } else if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.FLATOFF) {
        // FLATOFF: Subtract flat discount from total
        expectedTotalComboPrice = Math.round(totalBeforeDiscount - comboDiscount.discount_value);

        // Ensure price doesn't go negative
        if (expectedTotalComboPrice < 0) {
          expectedTotalComboPrice = 0;
        }
      } else {
        throw new ValidationError(`Invalid discount type. Must be ${COMBO_DISCOUNT_TYPE.PERCENT} or ${COMBO_DISCOUNT_TYPE.FLATOFF}`);
      }

      // Validate sent price matches expected total combo price
      if (price !== undefined && price !== expectedTotalComboPrice) {
        throw new ValidationError(`Price must be ₹${expectedTotalComboPrice} for combo discount (total for ${newQuantity} items)`);
      }

      // For combo items: treat as single unit, unitPrice = totalPrice (combo price)
      totalPrice = price !== undefined ? price : expectedTotalComboPrice;
      unitPrice = totalPrice; // Combo products are treated as single unit
    } else {
      // For regular items: price should be total price (quantity × unit_price)
      const expectedTotalPrice = sellingPrice * newQuantity;

      if (price !== undefined && price !== expectedTotalPrice) {
        throw new ValidationError(`Price must be ₹${expectedTotalPrice} for regular pricing (${newQuantity} × ₹${sellingPrice})`);
      }

      unitPrice = sellingPrice;
      totalPrice = price !== undefined ? price : expectedTotalPrice;
    }
  } else if (quantity !== undefined) {
    // Only quantity changed, recalculate total_price based on current unit_price
    // For regular items: total = quantity × unit_price
    // For combo items: total = (quantity × unit_price) - combo_discount
    if (currentIsCombo) {
      // If it's a combo item, validate combo discount still exists
      const comboDiscount = await getActiveComboDiscountForVariant(
        variantId,
        transaction,
      );

      if (!comboDiscount) {
        throw new ValidationError('No active combo discount found for this variant');
      }

      if (newQuantity !== comboDiscount.combo_quantity) {
        throw new ValidationError(`Quantity must be exactly ${comboDiscount.combo_quantity} for combo discount`);
      }

      // Calculate total combo price
      const totalBeforeDiscount = sellingPrice * newQuantity;
      let expectedTotalComboPrice;

      if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.PERCENT) {
        expectedTotalComboPrice = Math.round(totalBeforeDiscount * (1 - comboDiscount.discount_value / 100));
      } else if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.FLATOFF) {
        expectedTotalComboPrice = Math.round(totalBeforeDiscount - comboDiscount.discount_value);

        if (expectedTotalComboPrice < 0) {
          expectedTotalComboPrice = 0;
        }
      } else {
        throw new ValidationError(`Invalid discount type. Must be ${COMBO_DISCOUNT_TYPE.PERCENT} or ${COMBO_DISCOUNT_TYPE.FLATOFF}`);
      }

      totalPrice = expectedTotalComboPrice;
      unitPrice = expectedTotalComboPrice; // Combo products are treated as single unit
    } else {
      // Regular item: total = quantity × unit_price
      unitPrice = currentUnitPrice;
      totalPrice = currentUnitPrice * newQuantity;
    }
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(datas),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  // Only update fields that were provided
  if (quantity !== undefined) {
    doc.quantity = newQuantity;
  }
  if (price !== undefined) {
    doc.unit_price = unitPrice;
    doc.total_price = totalPrice;
  }
  if (isCombo !== undefined) {
    doc.is_combo = newIsCombo;
  }
  if (quantity !== undefined && price === undefined) {
    // Quantity changed but price didn't, recalculate total and unit_price
    doc.unit_price = unitPrice;
    doc.total_price = totalPrice;
  }

  await CartModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => handleServiceError(error, 'Transaction failed'));

module.exports = {
  saveCart,
  getCartOfUser,
  deleteCart,
  updateCart,
};
