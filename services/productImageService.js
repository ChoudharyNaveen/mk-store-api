/* eslint-disable max-lines */
const { v4: uuidV4 } = require('uuid');
const {
  productImage: ProductImageModel,
  product: ProductModel,
  productVariant: ProductVariantModel,
  sequelize,
  Sequelize: { Op },
} = require('../database');
const {
  convertCamelToSnake,
  convertSnakeToCamel,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const { uploadFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');
const {
  NotFoundError,
  ValidationError,
  handleServiceError,
} = require('../utils/serviceErrors');

const MAX_IMAGES_PER_PRODUCT = 10;

/**
 * Save multiple product images
 * @param {Object} data - Product image data
 * @param {Array} imageFiles - Array of image files
 * @returns {Promise<{doc: Array}>}
 */
const saveProductImages = async ({ data, imageFiles }) => {
  let transaction = null;

  try {
    const {
      createdBy, productId, variantId,
    } = data;

    if (!imageFiles || imageFiles.length === 0) {
      throw new ValidationError('At least one image file is required');
    }

    if (imageFiles.length > MAX_IMAGES_PER_PRODUCT) {
      throw new ValidationError(`Maximum ${MAX_IMAGES_PER_PRODUCT} images allowed per product`);
    }

    transaction = await sequelize.transaction();

    // Verify product exists
    const product = await ProductModel.findOne({
      where: { id: productId },
      attributes: [ 'id', 'vendor_id', 'branch_id' ],
      transaction,
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Verify variant exists if provided
    if (variantId) {
      const variant = await ProductVariantModel.findOne({
        where: { id: variantId, product_id: productId },
        attributes: [ 'id' ],
        transaction,
      });

      if (!variant) {
        throw new NotFoundError('Product variant not found or does not belong to this product');
      }
    }

    // Count existing images for this product/variant
    const existingImageCount = await ProductImageModel.count({
      where: {
        product_id: productId,
        variant_id: variantId || null,
        status: 'ACTIVE',
      },
      transaction,
    });

    if (existingImageCount + imageFiles.length > MAX_IMAGES_PER_PRODUCT) {
      throw new ValidationError(`Cannot add ${imageFiles.length} images. Product already has ${existingImageCount} images. Maximum is ${MAX_IMAGES_PER_PRODUCT}.`);
    }

    // Check if there's already a default image
    const hasDefault = await ProductImageModel.findOne({
      where: {
        product_id: productId,
        variant_id: variantId || null,
        is_default: true,
        status: 'ACTIVE',
      },
      transaction,
    });

    // Get max display_order for this product/variant
    const maxDisplayOrder = await ProductImageModel.max('display_order', {
      where: {
        product_id: productId,
        variant_id: variantId || null,
        status: 'ACTIVE',
      },
      transaction,
    }) || 0;

    // Upload all images in parallel
    const baseTimestamp = Date.now();
    const uploadPromises = imageFiles.map((imageFile, i) => {
      const filename = `product-image-${productId}-${variantId || 'main'}-${baseTimestamp}-${i}.jpg`;

      return uploadFile(imageFile, filename, product.vendor_id, product.branch_id);
    });

    const imageUrls = await Promise.all(uploadPromises);

    // Create all image records in parallel
    const createPromises = imageUrls.map((imageUrl, i) => {
      const concurrencyStamp = uuidV4();
      const isDefault = !hasDefault && i === 0; // First image is default if no default exists
      const displayOrder = maxDisplayOrder + i + 1;

      const imageDoc = {
        productId,
        variantId: variantId || null,
        imageUrl,
        isDefault,
        displayOrder,
        concurrencyStamp,
        createdBy,
      };

      return ProductImageModel.create(convertCamelToSnake(imageDoc), {
        transaction,
      });
    });

    const uploadedImages = await Promise.all(createPromises);

    await transaction.commit();

    const imageData = uploadedImages.map((img) => convertSnakeToCamel(img.dataValues));
    const convertedImages = convertImageFieldsToCloudFront(imageData);

    return { doc: convertedImages };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to save product images');
  }
};

/**
 * Update product image (is_default, display_order)
 * @param {Object} data - Image update data
 * @returns {Promise<{doc: object}>}
 */
const updateProductImage = async ({ data }) => {
  let transaction = null;

  try {
    const { id, ...datas } = data;
    const {
      concurrencyStamp, updatedBy, isDefault, displayOrder,
    } = datas;

    transaction = await sequelize.transaction();

    const image = await ProductImageModel.findOne({
      where: { id },
      attributes: [ 'id', 'product_id', 'variant_id', 'is_default', 'display_order', 'concurrency_stamp' ],
      transaction,
    });

    if (!image) {
      throw new NotFoundError('Product image not found');
    }

    const { concurrency_stamp: stamp } = image;

    if (concurrencyStamp !== stamp) {
      throw new ValidationError('Invalid concurrency stamp');
    }

    // If setting as default, unset other default images for this product/variant
    if (isDefault === true) {
      await ProductImageModel.update(
        { is_default: false },
        {
          where: {
            product_id: image.product_id,
            variant_id: image.variant_id || null,
            id: { [Op.ne]: id },
            status: 'ACTIVE',
          },
          transaction,
        },
      );
    }

    const updateData = {
      ...(isDefault !== undefined && { isDefault }),
      ...(displayOrder !== undefined && { displayOrder }),
      updatedBy,
      concurrencyStamp: uuidV4(),
    };

    await ProductImageModel.update(convertCamelToSnake(updateData), {
      where: { id },
      transaction,
    });

    const updated = await ProductImageModel.findOne({
      where: { id },
      transaction,
    });

    await transaction.commit();

    const imageData = convertSnakeToCamel(updated.dataValues);
    const convertedImage = convertImageFieldsToCloudFront([ imageData ])[0];

    return { doc: convertedImage };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to update product image');
  }
};

/**
 * Delete product image (soft delete)
 * @param {number} imageId - Image ID
 * @returns {Promise<{doc: object}>}
 */
const deleteProductImage = async (imageId) => {
  let transaction = null;

  try {
    transaction = await sequelize.transaction();

    const image = await ProductImageModel.findOne({
      where: { id: imageId },
      attributes: [ 'id', 'product_id', 'variant_id', 'is_default' ],
      transaction,
    });

    if (!image) {
      throw new NotFoundError('Product image not found');
    }

    // Soft delete
    await ProductImageModel.update(
      {
        status: 'INACTIVE',
        is_default: false,
        concurrency_stamp: uuidV4(),
      },
      {
        where: { id: imageId },
        transaction,
      },
    );

    // If deleted image was default, set another image as default
    if (image.is_default) {
      const nextImage = await ProductImageModel.findOne({
        where: {
          product_id: image.product_id,
          variant_id: image.variant_id || null,
          id: { [Op.ne]: imageId },
          status: 'ACTIVE',
        },
        order: [ [ 'display_order', 'ASC' ] ],
        transaction,
      });

      if (nextImage) {
        await ProductImageModel.update(
          { is_default: true, concurrency_stamp: uuidV4() },
          {
            where: { id: nextImage.id },
            transaction,
          },
        );
      }
    }

    await transaction.commit();

    return { doc: { message: 'Product image deleted successfully' } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to delete product image');
  }
};

/**
 * Get product images for a product or variant
 * @param {Object} payload - Query parameters
 * @returns {Promise<{doc: Array}>}
 */
const getProductImages = async (payload) => {
  try {
    const {
      productId, variantId, pageSize, pageNumber, filters, sorting,
    } = payload;

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const { limit, offset } = calculatePagination(pageSize, pageNumber);

    const where = generateWhereCondition(filters);

    where.product_id = productId;

    if (variantId) {
      where.variant_id = variantId;
    } else {
      where.variant_id = null; // Only product images, not variant-specific
    }

    const order = sorting
      ? generateOrderCondition(sorting)
      : [ [ 'is_default', 'DESC' ], [ 'display_order', 'ASC' ] ];

    const response = await findAndCountAllWithTotal(
      ProductImageModel,
      {
        where: { ...where, status: 'ACTIVE' },
        attributes: [
          'id',
          'product_id',
          'variant_id',
          'image_url',
          'is_default',
          'display_order',
          'status',
          'concurrency_stamp',
          'created_at',
          'updated_at',
        ],
        include: [
          {
            model: ProductModel,
            as: 'product',
            attributes: [ 'id', 'title' ],
          },
          {
            model: ProductVariantModel,
            as: 'variant',
            attributes: [ 'id', 'variant_name' ],
            required: false,
          },
        ],
        order,
        limit,
        offset,
      },
    );

    let doc = [];

    if (response) {
      const { count, totalCount, rows } = response;

      const dataValues = rows.map((element) => element.dataValues);

      doc = convertImageFieldsToCloudFront(JSON.parse(JSON.stringify(dataValues)));

      return { count, totalCount, doc };
    }

    return { count: 0, totalCount: 0, doc: [] };
  } catch (error) {
    return handleServiceError(error, 'Failed to get product images');
  }
};

module.exports = {
  saveProductImages,
  updateProductImage,
  deleteProductImage,
  getProductImages,
};
