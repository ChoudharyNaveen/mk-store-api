const { v4: uuidV4 } = require('uuid');
const {
  brand: BrandModel, branch: BranchModel, sequelize, product: ProductModel,
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
        await transaction.rollback();

        return { errors: { message: 'Branch not found' } };
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
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }

    return { errors: { message: 'failed to save brand' } };
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
    return { errors: { message: 'Brand not found' } };
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
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

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
    pageNumber,
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
    return { errors: { message: 'Cannot delete brand with associated products' } };
  }

  await BrandModel.destroy({
    where: { id: brandId },
    transaction,
  });

  return { doc: { message: 'successfully deleted brand' } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'failed to delete brand' } };
});

module.exports = {
  saveBrand,
  updateBrand,
  getBrand,
  deleteBrand,
};
