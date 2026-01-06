const { v4: uuidV4 } = require('uuid');
const {
  wishlist: WishlistModel,
  product: ProductModel,
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

const saveWishlist = async (data) => withTransaction(sequelize, async (transaction) => {
  const { createdBy, productId, ...datas } = data;

  const concurrencyStamp = uuidV4();

  const isExists = await WishlistModel.findOne({
    where: { product_id: productId, created_by: createdBy },
    attributes: [ 'id', 'product_id' ],
    transaction,
  });

  if (isExists) {
    return { isexists: isExists };
  }

  const doc = {
    ...datas,
    productId,
    concurrencyStamp,
    createdBy,
  };
  const cat = await WishlistModel.create(convertCamelToSnake(doc), {
    transaction,
  });

  return { doc: { cat } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'failed to save wishlist' } };
});

const getWishlist = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting, createdBy,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    WishlistModel,
    {
      where: { ...where, created_by: createdBy },
      attributes: [ 'id', 'product_id', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
      include: [
        {
          model: ProductModel,
          as: 'productDetails',
          attributes: [ 'id', 'title', 'selling_price', 'quantity', 'image', 'product_status' ],
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

const deleteWishlist = async (wishlistId) => {
  try {
    await WishlistModel.destroy({
      where: { id: wishlistId },
    });

    return { doc: { message: 'successfully deleted wishlist' } };
  } catch (error) {
    console.log(error);

    return { errors: { message: 'failed to delete wishlist' } };
  }
};

module.exports = {
  saveWishlist,
  getWishlist,
  deleteWishlist,
};
