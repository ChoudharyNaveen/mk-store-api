const { v4: uuidV4 } = require('uuid');
const { subCategory: SubCategoryModel, category: CategoryModel, sequelize } = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const { uploadFile } = require('../config/azure');

const saveSubCategory = async ({ data, imageFile }) => {
  let transaction = null;

  try {
    const { createdBy, ...datas } = data;

    transaction = await sequelize.transaction();
    const concurrencyStamp = uuidV4();

    let imageUrl = null;

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
      image: 'NA',
    };

    const cat = await SubCategoryModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    if (imageFile) {
      const blobName = `subCategory-${cat.id}-${Date.now()}.jpg`;

      imageUrl = await uploadFile(imageFile, blobName);
      await SubCategoryModel.update({ image: imageUrl }, {
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

    return { errors: { message: 'failed to save course subCategory' } };
  }
};

const updateSubCategory = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await SubCategoryModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!response) {
    return { errors: { message: 'SubCategory not found' } };
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
    const blobName = `subCategory-${id}-${Date.now()}.jpg`;
    const imageUrl = await uploadFile(imageFile, blobName);

    doc.image = imageUrl;
  }

  await SubCategoryModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

const getSubCategory = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    SubCategoryModel,
    {
      where: { ...where },
      attributes: [ 'id', 'title', 'description', 'image', 'status' ],
      include: [
        {
          model: CategoryModel,
          as: 'category',
          attributes: [ 'id', 'title', 'image' ],
        },
      ],
      order,
      limit,
      offset,
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
  saveSubCategory,
  updateSubCategory,
  getSubCategory,
};
