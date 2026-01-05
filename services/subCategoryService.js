const { v4: uuidV4 } = require('uuid');
const { subCategory: SubCategoryModel, sequelize } = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  extractILikeConditions,
  whereConditionsToSQL,
  findAndCountAllWithTotalQuery,
} = require('../utils/helper');
const { uploadFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');

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
      const filename = `subCategory-${cat.id}-${Date.now()}.jpg`;
      const vendorId = datas.vendorId || datas.vendor_id;
      const branchId = datas.branchId || datas.branch_id;

      imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);
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
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id' ],
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
    const filename = `subCategory-${id}-${Date.now()}.jpg`;
    const vendorId = response.vendor_id;
    const branchId = response.branch_id;

    const imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);

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

  // Extract iLike conditions from filters
  const { processedFilters, iLikeConditions } = extractILikeConditions(filters);

  const where = generateWhereCondition(processedFilters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'created_at', 'DESC' ] ];

  // Build WHERE clause from filters with qualified column names and iLike conditions
  const replacements = [];
  const whereClause = whereConditionsToSQL(where, 'subCategory', replacements, iLikeConditions);

  const whereSQL = whereClause ? `WHERE ${whereClause}` : '';

  // Build ORDER BY clause
  let orderClause = '';

  if (order && order.length > 0) {
    const orderParts = order.map(([ col, dir ]) => `subCategory.${col} ${dir}`);

    orderClause = `ORDER BY ${orderParts.join(', ')}`;
  } else {
    orderClause = 'ORDER BY subCategory.created_at DESC';
  }

  // Build SELECT query with JOIN
  const selectQuery = `
    SELECT 
      subCategory.id,
      subCategory.title,
      subCategory.description,
      subCategory.image,
      subCategory.status,
      subCategory.concurrency_stamp,
      category.id AS category_id,
      category.title AS category_title,
      category.image AS category_image
    FROM subCategory
    INNER JOIN category ON subCategory.category_id = category.id
    ${whereSQL}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  // Build COUNT query
  const countQuery = `
    SELECT COUNT(*) as count
    FROM subCategory
    INNER JOIN category ON subCategory.category_id = category.id
    ${whereSQL}
  `;

  replacements.push(limit, offset);

  const response = await findAndCountAllWithTotalQuery(
    selectQuery,
    countQuery,
    pageNumber,
    replacements,
  );

  let doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    // Transform rows to match the expected format (with nested category object)
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      image: row.image,
      status: row.status,
      concurrency_stamp: row.concurrency_stamp,
      category: {
        id: row.category_id,
        title: row.category_title,
        image: row.category_image,
      },
    }));

    // Convert image URLs to CloudFront URLs (automatically handles nested objects/arrays)
    doc = convertImageFieldsToCloudFront(items);

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

module.exports = {
  saveSubCategory,
  updateSubCategory,
  getSubCategory,
};
