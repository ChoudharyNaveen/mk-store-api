const { v4: uuidV4 } = require('uuid');
const {
  product: ProductModel,
  category: CategoryModel,
  subCategory: SubCategoryModel,
  brand: BrandModel,
  cart: CartModel,
  orderItem: OrderItemModel,
  wishlist: WishlistModel,
  branch: BranchModel,
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

const saveProduct = async ({ data, imageFile }) => {
  let transaction = null;

  try {
    const {
      createdBy, branchId, brandId, ...datas
    } = data;

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

    // Verify brand exists and belongs to the same vendor (if brandId is provided)
    if (brandId) {
      const brand = await BrandModel.findOne({
        where: { id: brandId },
        attributes: [ 'id', 'vendor_id', 'branch_id', 'status' ],
        transaction,
      });

      if (!brand) {
        await transaction.rollback();

        return { errors: { message: 'Brand not found' } };
      }

      // Verify brand belongs to the same vendor as the product
      if (brand.vendor_id !== datas.vendorId) {
        await transaction.rollback();

        return { errors: { message: 'Brand does not belong to the same vendor' } };
      }

      // Verify brand is active
      if (brand.status !== 'ACTIVE') {
        await transaction.rollback();

        return { errors: { message: 'Brand is not active' } };
      }

      datas.brandId = brandId;
    }

    const concurrencyStamp = uuidV4();

    let imageUrl = null;

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
      image: 'NA',
    };

    const cat = await ProductModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    if (imageFile) {
      const filename = `product-${cat.id}-${Date.now()}.jpg`;
      const { vendorId } = datas;

      imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);
      await ProductModel.update({ image: imageUrl }, {
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

    return { errors: { message: 'failed to save product' } };
  }
};

const updateProduct = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const {
    concurrencyStamp, updatedBy, brandId, vendorId,
  } = datas;

  const response = await ProductModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id' ],
    transaction,
  });

  if (!response) {
    return { errors: { message: 'Product not found' } };
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    return { concurrencyError: { message: 'invalid concurrency stamp' } };
  }

  // Get the final vendor_id (from existing product or update)
  const finalVendorId = vendorId || response.vendor_id;

  // Verify brand exists and belongs to the same vendor (if brandId is provided)
  if (brandId !== undefined) {
    if (brandId === null) {
      // Allow setting brand_id to null
      datas.brandId = null;
    } else {
      const brand = await BrandModel.findOne({
        where: { id: brandId },
        attributes: [ 'id', 'vendor_id', 'branch_id', 'status' ],
        transaction,
      });

      if (!brand) {
        return { errors: { message: 'Brand not found' } };
      }

      // Verify brand belongs to the same vendor as the product
      if (brand.vendor_id !== finalVendorId) {
        return { errors: { message: 'Brand does not belong to the same vendor' } };
      }

      // Verify brand is active
      if (brand.status !== 'ACTIVE') {
        return { errors: { message: 'Brand is not active' } };
      }
    }
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(data),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  if (imageFile) {
    const filename = `product-${id}-${Date.now()}.jpg`;
    const branchId = response.branch_id;

    const imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);

    doc.image = imageUrl;
  }

  await ProductModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

const getProduct = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    ProductModel,
    {
      where: { ...where },
      attributes: [
        'id',
        'title',
        'description',
        'price',
        'selling_price',
        'quantity',
        'items_per_unit',
        'image',
        'product_status',
        'status',
        'units',
        'nutritional',
        'expiry_date',
        'item_quantity',
        'item_unit',
        'concurrency_stamp',
        'created_at',
      ],
      include: [
        {
          model: CategoryModel,
          as: 'category',
          attributes: [ 'id', 'title', 'image' ],
        },
        {
          model: SubCategoryModel,
          as: 'subCategory',
          attributes: [ 'id', 'title', 'image' ],
        },
        {
          model: BrandModel,
          as: 'brand',
          attributes: [ 'id', 'name', 'logo' ],
          required: false,
        },
      ],
      order,
      limit,
      offset,
    },
    pageNumber,
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

const getProductsGroupedByCategory = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const allFilters = filters || [];
  const productFilters = allFilters.filter((f) => (f.key || '').startsWith('products.'));

  const productWhere = generateWhereCondition(productFilters);

  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    CategoryModel,
    {
      subQuery: false,
      where: { status: 'ACTIVE' },
      attributes: [ 'id', 'title', 'description', 'image', 'status' ],
      include: [
        {
          model: ProductModel,
          as: 'products',
          where: { ...productWhere, status: 'ACTIVE' },
          required: false,
          attributes: [
            'id',
            'title',
            'description',
            'price',
            'selling_price',
            'quantity',
            'items_per_unit',
            'image',
            'product_status',
            'status',
            'units',
            'nutritional',
            'expiry_date',
            'item_quantity',
            'item_unit',
            'concurrency_stamp',
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
        },
      ],
      distinct: true,
      order,
      limit,
      offset,
    },
    pageNumber,
  );

  let doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    // Convert image URLs to CloudFront URLs (automatically handles nested objects/arrays)
    const dataValues = rows.map((element) => element.dataValues);

    doc = convertImageFieldsToCloudFront(dataValues);

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const deleteProduct = async (productId) => withTransaction(sequelize, async (transaction) => {
  // Delete all related records in parallel
  await Promise.all([
    CartModel.destroy({
      where: { product_id: productId },
      transaction,
    }),
    OrderItemModel.destroy({
      where: { product_id: productId },
      transaction,
    }),
    WishlistModel.destroy({
      where: { product_id: productId },
      transaction,
    }),
    ProductModel.destroy({
      where: { id: productId },
      transaction,
    }),
  ]);

  return { doc: { message: 'successfully deleted product' } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'failed to delete product' } };
});

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  deleteProduct,
};
