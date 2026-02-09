const { v4: uuidV4 } = require('uuid');
const {
  brand: BrandModel,
  branch: BranchModel,
  sequelize,
  product: ProductModel,
  productType: ProductTypeModel,
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
const { uploadFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');
const {
  NotFoundError,
  ConcurrencyError,
  ValidationError,
  handleServiceError,
} = require('../utils/serviceErrors');

const saveBrand = async ({ data, logoFile }) => {
  let transaction = null;

  try {
    const { createdBy, branchId, ...datas } = data;

    transaction = await sequelize.transaction();

    // Verify branch exists and get vendor_id
    if (branchId) {
      const branch = await BranchModel.findOne({
        where: { id: branchId },
        attributes: [ 'id', 'vendor_id' ],
        transaction,
      });

      if (!branch) {
        throw new NotFoundError('Branch not found');
      }

      // Set vendor_id from branch
      datas.vendorId = branch.vendor_id;
      datas.branchId = branchId;
    }

    const concurrencyStamp = uuidV4();

    let logoUrl = null;

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
      logo: 'NA',
    };

    const brand = await BrandModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    if (logoFile) {
      const filename = `brand-${brand.id}-${Date.now()}.jpg`;
      const { vendorId } = datas;

      logoUrl = await uploadFile(logoFile, filename, vendorId, branchId);
      await BrandModel.update({ logo: logoUrl }, {
        where: { id: brand.id },
        transaction,
      });
    }
    await transaction.commit();

    return { doc: { brand } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to save brand');
  }
};

const updateBrand = async ({ data, logoFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await BrandModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Brand not found');
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

  if (logoFile) {
    const filename = `brand-${id}-${Date.now()}.jpg`;
    const vendorId = response.vendor_id;
    const branchId = response.branch_id;

    const logoUrl = await uploadFile(logoFile, filename, vendorId, branchId);

    doc.logo = logoUrl;
  }

  await BrandModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => handleServiceError(error, 'Transaction failed'));

const getBrand = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    BrandModel,
    {
      where: { ...where },
      attributes: [ 'id', 'name', 'description', 'logo', 'status', 'concurrency_stamp', 'created_at' ],
      order,
      limit,
      offset,
    },
  );
  let doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    const dataValues = rows.map((element) => {
      const values = element.dataValues;

      // Normalize created_at to an ISO string for consistent JSON output
      return {
        ...values,
        created_at: values.created_at instanceof Date
          ? values.created_at.toISOString()
          : values.created_at || null,
      };
    });

    // Convert logo URLs to CloudFront URLs (automatically handles nested objects/arrays)
    doc = convertImageFieldsToCloudFront(dataValues);

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const deleteBrand = async (brandId) => withTransaction(sequelize, async (transaction) => {
  // Check if brand has associated products
  const productCount = await ProductModel.count({
    where: { brand_id: brandId },
    transaction,
  });

  if (productCount > 0) {
    throw new ValidationError('Cannot delete brand with associated products');
  }

  await BrandModel.destroy({
    where: { id: brandId },
    transaction,
  });

  return { doc: { message: 'successfully deleted brand' } };
}).catch((error) => handleServiceError(error, 'Failed to delete brand'));

/**
 * Resolve subCategoryId, productTypeId, vendorId from productId when provided.
 * @returns {Promise<{ subCategoryId: number, productTypeId: number|null, vendorId: number }|null>}
 */
const resolveParamsFromProduct = async (productId) => {
  const product = await ProductModel.findOne({
    where: { id: productId },
    attributes: [ 'product_type_id', 'sub_category_id', 'vendor_id' ],
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return {
    subCategoryId: product.sub_category_id,
    productTypeId: product.product_type_id,
    vendorId: product.vendor_id,
  };
};

/**
 * Fetch distinct ACTIVE brands that have ACTIVE products for the given criteria.
 * @param {Object} params
 * @param {number} params.subCategoryId - Subcategory ID
 * @param {number|null|undefined} params.productTypeId - Optional product type ID (when undefined/null, all types in subcategory)
 * @param {number|null|undefined} params.vendorId - Optional vendor ID to scope results
 * @returns {Promise<Array>}
 */
const fetchBrandsBySubCategoryAndType = async ({ subCategoryId, productTypeId, vendorId }) => {
  const where = {
    sub_category_id: subCategoryId,
    status: 'ACTIVE',
    brand_id: { [Op.ne]: null },
  };

  if (productTypeId != null) {
    where.product_type_id = productTypeId;
  }

  if (vendorId != null) {
    where.vendor_id = vendorId;
  }

  const products = await ProductModel.findAll({
    where,
    attributes: [ 'brand_id' ],
    raw: true,
  });

  const brandIds = [ ...new Set(products.map((p) => p.brand_id).filter(Boolean)) ];

  if (brandIds.length === 0) {
    return [];
  }

  const brands = await BrandModel.findAll({
    where: { id: brandIds, status: 'ACTIVE' },
    attributes: [ 'id', 'name', 'description', 'logo', 'status', 'created_at' ],
  });

  const dataValues = brands.map((element) => {
    const values = element.dataValues;

    return {
      ...values,
      created_at: values.created_at instanceof Date
        ? values.created_at.toISOString()
        : values.created_at || null,
    };
  });

  return convertImageFieldsToCloudFront(dataValues);
};

/**
 * Get related brands by productId, subCategoryId, or productTypeId (and optional vendorId).
 * - When productId is provided: returns brands with same product type in same subcategory (and vendor) as that product.
 * - When subCategoryId is provided: returns brands that have ACTIVE products in that subcategory; optional productTypeId and vendorId narrow the result.
 * - When only productTypeId is provided: resolves subcategory from product_type, then returns brands for that type (optional vendorId).
 * @param {Object} params
 * @param {number} [params.productId] - Product ID (use one of productId, subCategoryId, productTypeId)
 * @param {number} [params.subCategoryId] - Subcategory ID
 * @param {number} [params.productTypeId] - Product type ID; when used alone, subcategory is resolved from product_type
 * @param {number} [params.vendorId] - Optional vendor filter
 * @returns {Promise<{ doc: Array, message?: string }>}
 */
const getRelatedBrandsForProduct = async ({
  productId, subCategoryId, productTypeId, vendorId,
}) => {
  let resolvedSubCategoryId;
  let resolvedProductTypeId;
  let resolvedVendorId;

  if (productId != null) {
    const resolved = await resolveParamsFromProduct(productId);

    resolvedSubCategoryId = resolved.subCategoryId;
    resolvedProductTypeId = resolved.productTypeId;
    resolvedVendorId = resolved.vendorId;

    if (resolvedProductTypeId == null) {
      return { doc: [], message: 'Product has no type.' };
    }
  } else if (subCategoryId != null) {
    resolvedSubCategoryId = subCategoryId;
    resolvedProductTypeId = productTypeId;
    resolvedVendorId = vendorId;
  } else if (productTypeId != null) {
    const productType = await ProductTypeModel.findOne({
      where: { id: productTypeId },
      attributes: [ 'sub_category_id' ],
    });

    if (!productType) {
      throw new NotFoundError('Product type not found');
    }

    resolvedSubCategoryId = productType.sub_category_id;
    resolvedProductTypeId = productTypeId;
    resolvedVendorId = vendorId;
  } else {
    return { doc: [], message: 'At least one of productId, subCategoryId or productTypeId is required.' };
  }

  const doc = await fetchBrandsBySubCategoryAndType({
    subCategoryId: resolvedSubCategoryId,
    productTypeId: resolvedProductTypeId,
    vendorId: resolvedVendorId,
  });

  return { doc };
};

/**
 * Get brand summary: total product count and active product count for a brand.
 * @param {Object} params
 * @param {number} params.id - Brand ID
 * @returns {Promise<{ doc: { totalProducts: number, activeProducts: number } }>}
 */
const getBrandSummary = async ({ id }) => {
  const where = { brand_id: id };

  const [ totalProducts, activeProducts ] = await Promise.all([
    ProductModel.count({ where }),
    ProductModel.count({
      where: { ...where, status: 'ACTIVE' },
    }),
  ]);

  return {
    doc: {
      totalProducts,
      activeProducts,
    },
  };
};

module.exports = {
  saveBrand,
  updateBrand,
  getBrand,
  getBrandSummary,
  deleteBrand,
  getRelatedBrandsForProduct,
};
