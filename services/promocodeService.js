const { v4: uuidV4 } = require('uuid');
const {
  promocode: PromocodeModel,
  orderDiscount: OrderDiscountModel,
  sequelize,
  Sequelize,
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
  NotFoundError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

const savePromocode = async (data) => {
  let transaction = null;

  try {
    const { createdBy, ...datas } = data;

    transaction = await sequelize.transaction();
    const concurrencyStamp = uuidV4();

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
    };

    const cat = await PromocodeModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    await transaction.commit();

    return { doc: { cat } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to save course Promocode');
  }
};

const updatePromocode = async (data) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await PromocodeModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Promocode not found');
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

  await PromocodeModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => handleServiceError(error, 'Transaction failed'));

const getPromocode = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    PromocodeModel,
    {
      where: { ...where },
      order,
      limit,
      offset,
    },
  );
  const doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    rows.map((element) => doc.push(JSON.parse(JSON.stringify(element.dataValues))));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

/**
 * Get promocode summary: total redemptions and total discounts given for a promocode.
 * @param {Object} params
 * @param {number} params.id - Promocode ID
 * @returns {Promise<{ doc: { totalRedemptions: number, totalDiscountsGiven: number } }>}
 */
const getPromocodeSummary = async ({ id }) => {
  const where = { promocode_id: id, discount_type: 'PROMOCODE' };

  const [ totalRedemptions, sumResult ] = await Promise.all([
    OrderDiscountModel.count({ where }),
    OrderDiscountModel.findOne({
      where,
      attributes: [ [ Sequelize.fn('SUM', Sequelize.col('discount_amount')), 'totalDiscountsGiven' ] ],
      raw: true,
    }),
  ]);

  const totalDiscountsGiven = sumResult?.totalDiscountsGiven != null
    ? parseFloat(sumResult.totalDiscountsGiven)
    : 0;

  return {
    doc: {
      totalRedemptions,
      totalDiscountsGiven,
    },
  };
};

module.exports = {
  savePromocode,
  updatePromocode,
  getPromocode,
  getPromocodeSummary,
};
