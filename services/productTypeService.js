const { v4: uuidV4 } = require('uuid');
const {
  productType: ProductTypeModel,
  subCategory: SubCategoryModel,
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

const saveProductType = async ({ data }) => {
  let transaction = null;

  try {
    const {
      createdBy, subCategoryId, title, ...datas
    } = data;

    transaction = await sequelize.transaction();

    const subCategory = await SubCategoryModel.findOne({
      where: { id: subCategoryId },
      attributes: [ 'id' ],
      transaction,
    });

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    const existingType = await ProductTypeModel.findOne({
      where: {
        sub_category_id: subCategoryId,
        title: title.trim(),
      },
      transaction,
    });

    if (existingType) {
      throw new ConflictError('Product type with this title already exists for this subcategory.');
    }

    const concurrencyStamp = uuidV4();
    const doc = {
      ...datas,
      subCategoryId,
      title: title.trim(),
      concurrencyStamp,
      createdBy,
    };

    const productType = await ProductTypeModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    await transaction.commit();

    return { doc: { productType } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.errors && error.errors.length > 0) {
        return handleServiceError(new ConflictError('Product type with this title already exists for this subcategory.'));
      }
    }

    return handleServiceError(error, 'Failed to save product type');
  }
};

const updateProductType = async ({ data }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy, title } = datas;

  const response = await ProductTypeModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'sub_category_id' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Product type not found');
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  if (title !== undefined && title !== null) {
    const existingType = await ProductTypeModel.findOne({
      where: {
        sub_category_id: response.sub_category_id,
        title: title.trim(),
        id: { [Op.ne]: id },
      },
      transaction,
    });

    if (existingType) {
      throw new ConflictError('Product type with this title already exists for this subcategory.');
    }
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(datas),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  if (title !== undefined) {
    doc.title = title.trim();
  }

  await ProductTypeModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  if (error.name === 'SequelizeUniqueConstraintError') {
    if (error.errors && error.errors.length > 0) {
      return handleServiceError(new ConflictError('Product type with this title already exists for this subcategory.'));
    }
  }

  return handleServiceError(error, 'Transaction failed');
});

const getProductType = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters || []);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    ProductTypeModel,
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

    rows.forEach((element) => doc.push(element.dataValues));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

module.exports = {
  saveProductType,
  updateProductType,
  getProductType,
};
