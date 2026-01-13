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

const saveCart = async (data) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy, productId, variantId, vendorId, branchId, ...datas
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
    attributes: [ 'id', 'product_id' ],
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

  const concurrencyStamp = uuidV4();

  // Check if cart item already exists (same product/variant, user, vendor, branch)
  const existingWhere = {
    created_by: createdBy,
    vendor_id: finalVendorId,
    branch_id: finalBranchId,
    product_id: finalProductId,
    variant_id: finalVariantId,
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
      attributes: [ 'id', 'product_id', 'variant_id', 'vendor_id', 'branch_id', 'quantity', 'status', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
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
          attributes: [ 'id', 'variant_name', 'variant_type', 'selling_price', 'quantity', 'product_status' ],
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
  const { id, quantity, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await CartModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
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

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(data),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

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
