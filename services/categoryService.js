const { v4: uuidV4 } = require('uuid');
const {
  category: CategoryModel,
  subCategory: SubCategoryModel,
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
  findAndCountAllWithTotal,
} = require('../utils/helper');
const { uploadFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');

const saveCategory = async ({ data, imageFile }) => {
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

    let imageUrl = null;

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
      image: 'NA',
    };

    const cat = await CategoryModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    if (imageFile) {
      const filename = `category-${cat.id}-${Date.now()}.jpg`;
      const { vendorId } = datas;

      imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);
      await CategoryModel.update({ image: imageUrl }, {
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

    return { errors: { message: 'failed to save category' } };
  }
};

const updateCategory = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await CategoryModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id' ],
    transaction,
  });

  if (!response) {
    return { errors: { message: 'Category not found' } };
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
    const filename = `category-${id}-${Date.now()}.jpg`;
    const vendorId = response.vendor_id;
    const branchId = response.branch_id;

    const imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);

    doc.image = imageUrl;
  }

  await CategoryModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

const getCategory = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    CategoryModel,
    {
      where: { ...where },
      attributes: [ 'id', 'title', 'description', 'image', 'status', 'concurrency_stamp', 'created_at', 'updated_at' ],
      order,
      limit,
      offset,
    },
  );
  let doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    const dataValues = rows.map((element) => element.dataValues);

    // Convert image URLs to CloudFront URLs (automatically handles nested objects/arrays)
    doc = convertImageFieldsToCloudFront(JSON.parse(JSON.stringify(dataValues)));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const getCategoryDetails = async (categoryId) => {
  try {
    const category = await CategoryModel.findOne({
      where: { id: categoryId },
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

    if (!category) {
      return { error: 'Category not found' };
    }

    // Get all subcategories
    const subCategories = await SubCategoryModel.findAll({
      where: {
        category_id: categoryId,
        status: 'ACTIVE',
      },
      attributes: [
        'id',
        'title',
        'description',
        'image',
        'status',
        'created_at',
      ],
      order: [ [ 'created_at', 'DESC' ] ],
    });

    // Get all products in this category
    const products = await ProductModel.findAll({
      where: {
        category_id: categoryId,
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
      ],
      order: [ [ 'created_at', 'DESC' ] ],
      limit: 20, // Limit for details page
    });

    // Get statistics
    const [ subCategoryCount, productCount ] = await Promise.all([
      SubCategoryModel.count({
        where: { category_id: categoryId, status: 'ACTIVE' },
      }),
      ProductModel.count({
        where: { category_id: categoryId, status: 'ACTIVE' },
      }),
    ]);

    const categoryData = category.dataValues;
    const statistics = {
      subcategory_count: subCategoryCount,
      product_count: productCount,
    };

    // Convert image URLs to CloudFront URLs
    const convertedCategory = convertImageFieldsToCloudFront([ categoryData ])[0];
    const convertedSubCategories = convertImageFieldsToCloudFront(subCategories.map((sc) => sc.dataValues));
    const convertedProducts = convertImageFieldsToCloudFront(products.map((p) => p.dataValues));

    return {
      doc: {
        ...convertedCategory,
        statistics,
        sub_categories: convertedSubCategories,
        products: convertedProducts,
      },
    };
  } catch (error) {
    console.error('Error in getCategoryDetails:', error);

    return { error: 'Failed to fetch category details' };
  }
};

module.exports = {
  saveCategory,
  updateCategory,
  getCategory,
  getCategoryDetails,
};
