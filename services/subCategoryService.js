const { v4: uuidV4 } = require('uuid');
const {
  subCategory: SubCategoryModel,
  category: CategoryModel,
  product: ProductModel,
  brand: BrandModel,
  branch: BranchModel,
  vendor: VendorModel,
  sequelize,
} = require('../database');
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
const {
  NotFoundError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

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
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to save course subCategory');
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
    throw new NotFoundError('SubCategory not found');
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
}).catch((error) => handleServiceError(error, 'Transaction failed'));

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
      subCategory.created_at,
      subCategory.updated_at,
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
      created_at: row.created_at,
      updated_at: row.updated_at,
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

const getSubCategoriesByCategoryId = async (payload) => {
  const {
    categoryId, pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  // Add categoryId filter to filters array
  const allFilters = [
    { key: 'category_id', eq: categoryId.toString() },
    ...(filters || []),
  ];

  // Extract iLike conditions from filters
  const { processedFilters, iLikeConditions } = extractILikeConditions(allFilters);

  const where = generateWhereCondition(processedFilters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'title', 'ASC' ] ];

  // Build WHERE clause from filters with qualified column names and iLike conditions
  const replacements = [];
  const whereClause = whereConditionsToSQL(where, 'subCategory', replacements, iLikeConditions);

  const whereSQL = whereClause ? `WHERE ${whereClause}` : '';

  // Build ORDER BY clause
  let orderClause = '';

  if (order && order.length > 0) {
    const orderParts = order.map(([ col, dir ]) => {
      // Check if column already has table prefix
      if (col.includes('.')) {
        return `${col} ${dir}`;
      }

      // Handle special case for title -> name mapping
      if (col === 'name' || col === 'title') {
        return `subCategory.title ${dir}`;
      }

      // Handle products_count which is an alias
      if (col === 'products_count') {
        return `products_count ${dir}`;
      }

      return `subCategory.${col} ${dir}`;
    });

    orderClause = `ORDER BY ${orderParts.join(', ')}`;
  } else {
    orderClause = 'ORDER BY subCategory.title ASC';
  }

  // Build SELECT query with LEFT JOIN to count products
  const selectQuery = `
    SELECT 
      subCategory.id,
      subCategory.title,
      subCategory.status,
      COUNT(DISTINCT product.id) AS products_count
    FROM subCategory
    LEFT JOIN product ON subCategory.id = product.sub_category_id 
      AND product.status = 'ACTIVE'
    ${whereSQL}
    GROUP BY subCategory.id, subCategory.title, subCategory.status
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  // Build COUNT query for pagination
  const countQuery = `
    SELECT COUNT(DISTINCT subCategory.id) as count
    FROM subCategory
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

    // Transform rows to match the expected format (id, name, products_count, status)
    const items = rows.map((row) => ({
      id: row.id,
      name: row.title,
      products_count: Number(row.products_count) || 0,
      status: row.status,
    }));

    doc = items;

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const getSubCategoryDetails = async (subCategoryId) => {
  try {
    const subCategory = await SubCategoryModel.findOne({
      where: { id: subCategoryId },
      attributes: [
        'id',
        'title',
        'description',
        'image',
        'status',
        'concurrency_stamp',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: CategoryModel,
          as: 'category',
          attributes: [ 'id', 'title', 'description', 'image', 'status' ],
        },
        {
          model: BranchModel,
          as: 'branch',
          attributes: [ 'id', 'name', 'address', 'contact_number' ],
        },
        {
          model: VendorModel,
          as: 'vendor',
          attributes: [ 'id', 'name', 'code' ],
        },
      ],
    });

    if (!subCategory) {
      return handleServiceError(new NotFoundError('SubCategory not found'));
    }

    // Get all products in this subcategory
    const products = await ProductModel.findAll({
      where: {
        sub_category_id: subCategoryId,
        status: 'ACTIVE',
      },
      attributes: [
        'id',
        'title',
        'description',
        'selling_price',
        'image',
        'status',
        'quantity',
        'created_at',
      ],
      include: [
        {
          model: BrandModel,
          as: 'brand',
          attributes: [ 'id', 'name', 'logo' ],
          required: false,
        },
        {
          model: CategoryModel,
          as: 'category',
          attributes: [ 'id', 'title', 'image' ],
        },
      ],
      order: [ [ 'created_at', 'DESC' ] ],
      limit: 20, // Limit for details page
    });

    // Get statistics
    const productCount = await ProductModel.count({
      where: { sub_category_id: subCategoryId, status: 'ACTIVE' },
    });

    const subCategoryData = subCategory.dataValues;
    const statistics = {
      product_count: productCount,
    };

    // Convert image URLs to CloudFront URLs
    const convertedSubCategory = convertImageFieldsToCloudFront([ subCategoryData ])[0];
    const convertedProducts = convertImageFieldsToCloudFront(products.map((p) => p.dataValues));

    return {
      doc: {
        ...convertedSubCategory,
        statistics,
        products: convertedProducts,
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch subcategory details');
  }
};

module.exports = {
  saveSubCategory,
  updateSubCategory,
  getSubCategory,
  getSubCategoriesByCategoryId,
  getSubCategoryDetails,
};
