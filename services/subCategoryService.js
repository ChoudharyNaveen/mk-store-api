const { v4: uuidV4 } = require('uuid');
const { subCategory: SubCategoryModel, category: CategoryModel, sequelize } = require('../database');
const Helper = require('../utils/helper');
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

    const cat = await SubCategoryModel.create(Helper.convertCamelToSnake(doc), {
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

const updateSubCategory = async ({ data, imageFile }) => {
  let transaction = null;
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  try {
    transaction = await sequelize.transaction();
    const response = await SubCategoryModel.findOne({
      where: { id },
    });

    if (response) {
      const { concurrency_stamp: stamp } = response;

      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4();
        const doc = {
          ...Helper.convertCamelToSnake(data),
          updatedBy,
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

const getSubCategory = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = Helper.calculatePagination(pageSize, pageNumber);

  const where = Helper.generateWhereCondition(filters);
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await SubCategoryModel.findAndCountAll({
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
  });
  const doc = [];

  if (response) {
    const { count, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, doc };
  }

  return { count: 0, doc: [] };
};

module.exports = {
  saveSubCategory,
  updateSubCategory,
  getSubCategory,
};
