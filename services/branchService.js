const { v4: uuidV4 } = require('uuid');
const {
  branch: BranchModel,
  vendor: VendorModel,
  sequelize,
  Sequelize: { Op },
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
  ConflictError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

const saveBranch = async ({ data }) => {
  let transaction = null;

  try {
    const {
      createdBy, vendorId, code, ...datas
    } = data;

    transaction = await sequelize.transaction();

    // Verify vendor exists
    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
      attributes: [ 'id' ],
      transaction,
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    // Check if branch code is provided and if it already exists
    if (code) {
      const existingBranch = await BranchModel.findOne({
        where: { code },
        transaction,
      });

      if (existingBranch) {
        throw new ConflictError('Branch code already exists. Please use a different code.');
      }
    }

    const concurrencyStamp = uuidV4();

    const doc = {
      ...datas,
      vendorId,
      code: code || null,
      concurrencyStamp,
      createdBy,
    };

    const branch = await BranchModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    await transaction.commit();

    return { doc: { branch } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    // Handle unique constraint violation from database
    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.errors && error.errors.some((e) => e.path === 'code')) {
        return handleServiceError(new ConflictError('Branch code already exists. Please use a different code.'));
      }
    }

    return handleServiceError(error, 'Failed to save branch');
  }
};

const updateBranch = async ({ data }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const {
    concurrencyStamp, updatedBy, vendorId, code,
  } = datas;

  // If vendorId is being updated, verify it exists
  if (vendorId) {
    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
      attributes: [ 'id' ],
      transaction,
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }
  }

  // Check if branch code is being updated and if it already exists
  if (code) {
    const existingBranch = await BranchModel.findOne({
      where: { code, id: { [Op.ne]: id } },
      transaction,
    });

    if (existingBranch) {
      throw new ConflictError('Branch code already exists. Please use a different code.');
    }
  }

  const response = await BranchModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Branch not found');
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

  await BranchModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  // Handle unique constraint violation from database
  if (error.name === 'SequelizeUniqueConstraintError') {
    if (error.errors && error.errors.some((e) => e.path === 'code')) {
      return handleServiceError(new ConflictError('Branch code already exists. Please use a different code.'));
    }
  }

  return handleServiceError(error, 'Transaction failed');
});

const getBranch = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    BranchModel,
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

    rows.map((element) => doc.push(element.dataValues));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

module.exports = {
  saveBranch,
  updateBranch,
  getBranch,
};
