const { v4: uuidV4 } = require('uuid');
const {
  cart: CartModel,
  user: UserModel,
  product: ProductModel,
  sequelize,
} = require('../database');
const Helper = require('../utils/helper');

const saveCart = async (data) => {
  let transaction = null;

  try {
    const { createdBy, productId, ...datas } = data;

    transaction = await sequelize.transaction();
    const concurrencyStamp = uuidV4();

    const isExists = await CartModel.findOne({
      where: { product_id: productId },
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
    const cat = await CartModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    });

    await transaction.commit();

    return { doc: { cat } };
  } catch (error) {
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }

    return { errors: { message: 'failed to save cart' } };
  }
};

const getCartOfUser = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = Helper.calculatePagination(pageSize, pageNumber);

  const where = Helper.generateWhereCondition(filters);
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await CartModel.findAndCountAll({
    where: { ...where, status: 'ACTIVE' },
    include: [
      {
        model: ProductModel,
        as: 'productDetails',
      },
      {
        model: UserModel,
        as: 'user',
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

const updateCart = async (data) => {
  let transaction = null;
  const { id, quantity, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  try {
    transaction = await sequelize.transaction();
    const response = await CartModel.findOne({
      where: { id },
    });

    if (response) {
      if (quantity === 0) {
        await CartModel.destroy({
          where: { id },
        });

        return { cartZero: 'item removed from cart' };
      }
      const { concurrency_stamp: stamp } = response;

      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4();
        const doc = {
          ...Helper.convertCamelToSnake(data),
          updatedBy,
          concurrency_stamp: newConcurrencyStamp,
        };

        await CartModel.update(doc, {
          where: { id },
          transaction,
        });
        await transaction.commit();

        return { doc: { concurrencyStamp: newConcurrencyStamp } };
      }
      await transaction.rollback();

      return { concurrencyError: { message: 'invalid concurrency stamp' } };
    }

    return {};
  } catch (error) {
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }

    return { errors: { message: 'transaction failed' } };
  }
};

module.exports = {
  saveCart,
  getCartOfUser,
  deleteCart,
  updateCart,
};
