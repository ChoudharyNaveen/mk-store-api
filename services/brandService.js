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
} = require('../utils/helper');
const { uploadFile } = require('../config/azure');

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
      const blobName = `brand-${brand.id}-${Date.now()}.jpg`;

      logoUrl = await uploadFile(logoFile, blobName);
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
    attributes: [ 'id', 'concurrency_stamp' ],
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
    const blobName = `brand-${id}-${Date.now()}.jpg`;
    const logoUrl = await uploadFile(logoFile, blobName);

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

  const response = await BrandModel.findAndCountAll({
    where: { ...where },
    attributes: [ 'id', 'name', 'description', 'logo', 'status' ],
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
