const { v4: uuidV4 } = require('uuid');
const {
  cart: CartModel,
  user: UserModel,
  product: ProductModel,
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

const saveCart = async (data) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy, productId, vendorId, branchId, ...datas
  } = data;

  // Fetch product to validate vendor_id and branch_id match
  const product = await ProductModel.findOne({
    where: { id: productId },
    attributes: [ 'id', 'vendor_id', 'branch_id' ],
    transaction,
  });

  if (!product) {
    return { errors: { message: 'Product not found' } };
  }

  // Validate that provided vendorId and branchId match the product
  if (vendorId !== product.vendor_id) {
    return { errors: { message: 'Vendor ID does not match the product\'s vendor' } };
  }

  if (branchId !== product.branch_id) {
    return { errors: { message: 'Branch ID does not match the product\'s branch' } };
  }

  // Validate branch exists and belongs to vendor
  const branch = await BranchModel.findOne({
    where: { id: branchId, vendor_id: vendorId },
    attributes: [ 'id' ],
    transaction,
  });

  if (!branch) {
    return { errors: { message: 'Branch not found or does not belong to vendor' } };
  }

  const finalVendorId = vendorId;
  const finalBranchId = branchId;

  const concurrencyStamp = uuidV4();

  const isExists = await CartModel.findOne({
    where: {
      product_id: productId,
      created_by: createdBy,
      vendor_id: finalVendorId,
      branch_id: finalBranchId,
    },
    attributes: [ 'id', 'product_id', 'quantity' ],
    transaction,
  });

  if (isExists) {
    return { isexists: isExists };
  }

  const doc = {
    ...datas,
    productId,
    vendorId: finalVendorId,
    branchId: finalBranchId,
    concurrencyStamp,
    createdBy,
  };
  const cat = await CartModel.create(convertCamelToSnake(doc), {
    transaction,
  });

  return { doc: { cat } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'failed to save cart' } };
});

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
      attributes: [ 'id', 'product_id', 'vendor_id', 'branch_id', 'quantity', 'status', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
      include: [
        {
          model: ProductModel,
          as: 'productDetails',
          attributes: [ 'id', 'title', 'selling_price', 'quantity', 'image', 'product_status' ],
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
    pageNumber,
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
    console.log(error);

    return { errors: { message: 'failed to delete cart' } };
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
    return { errors: { message: 'Cart item not found' } };
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
    return { concurrencyError: { message: 'invalid concurrency stamp' } };
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
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

module.exports = {
  saveCart,
  getCartOfUser,
  deleteCart,
  updateCart,
};
