const { v4: uuidV4 } = require('uuid');
const {
  product: ProductModel,
  category: CategoryModel,
  subCategory: SubCategoryModel,
  cart: CartModel,
  orderItem: OrderItemModel,
  wishlist: WishlistModel,
  branch: BranchModel,
  sequelize,
} = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
} = require('../utils/helper');
const { uploadFile } = require('../config/azure');

const saveProduct = async ({ data, imageFile }) => {
  let transaction = null;

  try {
    const { createdBy, branchId, ...datas } = data;

    transaction = await sequelize.transaction();

    // Verify branch exists and get vendor_id
    if (branchId) {
      const branch = await BranchModel.findOne({
        where: { id: branchId },
        attributes: [ 'id', 'vendor_id' ],
        transaction,
      });

      if (!branch) {
        await transaction.rollback();

        return { errors: { message: 'Branch not found' } };
      }

      // Set vendor_id from branch
      datas.vendorId = branch.vendor_id;
      datas.branchId = branchId;
    }

    const concurrencyStamp = uuidV4();

    let imageUrl = null;

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
      image: 'NA',
    };

    const cat = await ProductModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    if (imageFile) {
      const blobName = `product-${cat.id}-${Date.now()}.jpg`;

      imageUrl = await uploadFile(imageFile, blobName);
      await ProductModel.update({ image: imageUrl }, {
        where: { id: cat.id },
        transaction,
      });
    }
    await transaction.commit();

    return { doc: { cat } };
  } catch (error) {
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }

    return { errors: { message: 'failed to save product' } };
  }
};

const updateProduct = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await ProductModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!response) {
    return { errors: { message: 'Product not found' } };
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

  if (imageFile) {
    const blobName = `product-${id}-${Date.now()}.jpg`;
    const imageUrl = await uploadFile(imageFile, blobName);

    doc.image = imageUrl;
  }

  await ProductModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

const getProduct = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await ProductModel.findAndCountAll({
    where: { ...where },
    attributes: [
      'id',
      'title',
      'description',
      'price',
      'selling_price',
      'quantity',
      'image',
      'product_status',
      'status',
      'units',
      'nutritional',
    ],
    include: [
      {
        model: CategoryModel,
        as: 'category',
        attributes: [ 'id', 'title', 'image' ],
      },
      {
        model: SubCategoryModel,
        as: 'subCategory',
        attributes: [ 'id', 'title', 'image' ],
      },
    ],
    order,
    limit,
    offset,
  });
  const doc = [];

  if (response) {
    const { count, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, doc };
  }

  return { count: 0, doc: [] };
};

const getProductsGroupedByCategory = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const allFilters = filters || [];
  const productFilters = allFilters.filter((f) => (f.key || '').startsWith('products.'));

  const productWhere = generateWhereCondition(productFilters);

  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await CategoryModel.findAndCountAll({
    subQuery: false,
    where: { status: 'ACTIVE' },
    attributes: [ 'id', 'title', 'description', 'image', 'status' ],
    include: [
      {
        model: ProductModel,
        as: 'products',
        where: { ...productWhere, status: 'ACTIVE' },
        required: false,
        attributes: [
          'id',
          'title',
          'description',
          'price',
          'selling_price',
          'quantity',
          'image',
          'product_status',
          'status',
          'units',
          'nutritional',
        ],
      },
    ],
    distinct: true,
    order,
    limit,
    offset,
  });

  const doc = [];

  if (response) {
    const { count, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, doc };
  }

  return { count: 0, doc: [] };
};

const deleteProduct = async (productId) => withTransaction(sequelize, async (transaction) => {
  // Delete all related records in parallel
  await Promise.all([
    CartModel.destroy({
      where: { product_id: productId },
      transaction,
    }),
    OrderItemModel.destroy({
      where: { product_id: productId },
      transaction,
    }),
    WishlistModel.destroy({
      where: { product_id: productId },
      transaction,
    }),
    ProductModel.destroy({
      where: { id: productId },
      transaction,
    }),
  ]);

  return { doc: { message: 'successfully deleted product' } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'failed to delete product' } };
});

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  deleteProduct,
};
