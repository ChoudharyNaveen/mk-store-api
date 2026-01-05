const { v4: uuidV4 } = require('uuid');
const {
  address: AddressModel,
  user: UserModel,
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

const saveAddress = async (data) => withTransaction(sequelize, async (transaction) => {
  const { createdBy, ...datas } = data;

  const concurrencyStamp = uuidV4();

  const doc = {
    ...datas,
    concurrencyStamp,
    createdBy,
  };
  const cat = await AddressModel.create(convertCamelToSnake(doc), {
    transaction,
  });

  return { doc: { cat } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'failed to save address' } };
});

const updateAddress = async (data) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await AddressModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!response) {
    return { errors: { message: 'Address not found' } };
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

  await AddressModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

const getAddress = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    AddressModel,
    {
      where: { ...where },
      attributes: [ 'id', 'house_no', 'street_details', 'landmark', 'name', 'mobile_number', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
      include: [
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

module.exports = {
  saveAddress,
  updateAddress,
  getAddress,
};
