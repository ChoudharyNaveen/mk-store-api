const { v4: uuidV4 } = require('uuid');
const {
  cart: CartModel,
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

// Helper: Get combo discount by ID and validate it belongs to variant
const getComboDiscountById = async (comboId, variantId, transaction = null) => {
  const currentDate = new Date();

  const options = {
    where: {
      id: comboId,
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

  if (!comboDiscount) {
    throw new ValidationError('Combo discount not found, inactive, or does not belong to this variant');
  }

  return comboDiscount;
};

// Helper: Calculate combo price for ONE combo set
const calculateComboPricePerSet = (sellingPrice, comboDiscount) => {
  const basePrice = comboDiscount.combo_quantity * sellingPrice;
  let comboPricePerSet;

  if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.PERCENT) {
    comboPricePerSet = Math.round(basePrice * (1 - comboDiscount.discount_value / 100));
  } else if (comboDiscount.discount_type === COMBO_DISCOUNT_TYPE.FLATOFF) {
    comboPricePerSet = Math.round(basePrice - comboDiscount.discount_value);
    if (comboPricePerSet < 0) {
      comboPricePerSet = 0;
    }
  } else {
    throw new ValidationError(`Invalid discount type. Must be ${COMBO_DISCOUNT_TYPE.PERCENT} or ${COMBO_DISCOUNT_TYPE.FLATOFF}`);
  }

  return comboPricePerSet;
};

const saveCart = async (data) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy, productId, variantId, vendorId, branchId, comboId, quantity, ...datas
  } = data;

  // Validate: Both productId and variantId are required
  if (!productId) {
    throw new ValidationError('productId is required');
  }

  if (!variantId) {
    throw new ValidationError('variantId is required');
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

  // Calculate price based on comboId
  let unitPrice;
  let totalPrice;
  let finalComboId = null;

  if (comboId) {
    // Validate combo discount exists and belongs to variant
    const comboDiscount = await getComboDiscountById(comboId, variantId, transaction);

    // Calculate combo price for ONE combo set
    const comboPricePerSet = calculateComboPricePerSet(sellingPrice, comboDiscount);

    // Store combo price per set
    unitPrice = comboPricePerSet;
    totalPrice = comboPricePerSet * quantity;
    finalComboId = comboId;
  } else {
    // For regular items: calculate total price (quantity × unit_price)
    unitPrice = sellingPrice;
    totalPrice = sellingPrice * quantity;
    finalComboId = null;
  }

  const concurrencyStamp = uuidV4();

  // Check if cart item already exists (same product/variant, user, vendor, branch, combo_id)
  const existingWhere = {
    created_by: createdBy,
    vendor_id: finalVendorId,
    branch_id: finalBranchId,
    product_id: finalProductId,
    variant_id: finalVariantId,
    combo_id: finalComboId || null,
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
    comboId: finalComboId,
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
      attributes: [ 'id', 'product_id', 'variant_id', 'vendor_id', 'branch_id', 'quantity', 'combo_id', 'unit_price', 'total_price', 'status', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
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

    const totalPrice = doc.reduce((acc, item) => acc + item.total_price, 0);

    return { count, totalCount, doc: { totalPrice, cartItems: doc } };
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
    id, quantity, comboId, ...datas
  } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await CartModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'variant_id', 'combo_id', 'unit_price', 'quantity' ],
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
    concurrency_stamp: stamp, variant_id: variantId, combo_id: currentComboId,
  } = response;
  const { variant } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  // Validation: prevent converting combo cart item back to regular or changing comboId
  if (currentComboId) {
    // For existing combo cart items, client must send the same comboId
    if (comboId === undefined || comboId === null) {
      throw new ValidationError('comboId is required when updating a combo cart item');
    }

    if (comboId !== currentComboId) {
      throw new ValidationError('Cannot change combo discount for an existing combo cart item. Remove and add again with a different combo.');
    }
  }

  // Determine combo status
  let newComboId;

  if (comboId !== undefined) {
    newComboId = comboId; // Can be null to switch from combo to regular
  } else {
    newComboId = currentComboId; // Keep current combo_id
  }

  const newQuantity = quantity !== undefined ? quantity : response.quantity;
  const sellingPrice = variant.selling_price;

  let unitPrice;
  let totalPrice;

  // Calculate prices based on combo status
  if (newComboId) {
    // Combo item: fetch combo discount and calculate combo price per set
    const comboDiscount = await getComboDiscountById(newComboId, variantId, transaction);
    const comboPricePerSet = calculateComboPricePerSet(sellingPrice, comboDiscount);

    // Use combo price per set
    unitPrice = comboPricePerSet;
    totalPrice = comboPricePerSet * newQuantity;
  } else {
    // Regular item: calculate from quantity
    unitPrice = sellingPrice;
    totalPrice = sellingPrice * newQuantity;
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
  if (comboId !== undefined || quantity !== undefined) {
    // Recalculate prices when comboId or quantity changes
    doc.unit_price = unitPrice;
    doc.total_price = totalPrice;
  }
  if (comboId !== undefined) {
    doc.combo_id = newComboId;
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
