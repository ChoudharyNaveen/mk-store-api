/* eslint-disable max-lines */
/* eslint-disable no-restricted-syntax */
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
  vendor: VendorModel,
  productVariant: ProductVariantModel,
  productImage: ProductImageModel,
  sequelize,
  Sequelize: { Op },
} = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  convertSnakeToCamel,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const { uploadFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');
const InventoryMovementService = require('./inventoryMovementService');
const {
  NotFoundError,
  ValidationError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

const saveProduct = async ({ data, imageFile, imageFiles }) => {
  let transaction = null;

  try {
    const {
      createdBy, branchId, brandId, variants: variantsData, imagesData, ...datas
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
        throw new NotFoundError('Branch not found');
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
        throw new NotFoundError('Brand not found');
      }

      // Verify brand belongs to the same vendor as the product
      if (brand.vendor_id !== datas.vendorId) {
        throw new ValidationError('Brand does not belong to the same vendor');
      }

      // Verify brand is active
      if (brand.status !== 'ACTIVE') {
        throw new ValidationError('Brand is not active');
      }

      datas.brandId = brandId;
    }

    const concurrencyStamp = uuidV4();

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
    };

    const cat = await ProductModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    // Handle legacy single image file (for backward compatibility) - now creates product_image record
    if (imageFile) {
      const filename = `product-${cat.id}-${Date.now()}.jpg`;
      const { vendorId } = datas;

      const imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);

      // Create product_image record instead of updating product.image
      const imageConcurrencyStamp = uuidV4();
      const imageDoc = {
        productId: cat.id,
        variantId: null,
        imageUrl,
        isDefault: true,
        displayOrder: 1,
        concurrencyStamp: imageConcurrencyStamp,
        createdBy,
      };

      await ProductImageModel.create(convertCamelToSnake(imageDoc), {
        transaction,
      });
    }

    // Create variants if provided (within the same transaction)
    const createdVariants = [];

    if (variantsData && Array.isArray(variantsData) && variantsData.length > 0) {
      // Validate variant names don't conflict
      const variantNames = variantsData.map((v) => v.variantName);

      if (new Set(variantNames).size !== variantNames.length) {
        throw new ValidationError('Duplicate variant names are not allowed');
      }

      // Check for existing variants with same names
      const existingVariants = await ProductVariantModel.findAll({
        where: {
          product_id: cat.id,
          variant_name: { [Op.in]: variantNames },
          status: 'ACTIVE',
        },
        attributes: [ 'variant_name' ],
        transaction,
      });

      if (existingVariants.length > 0) {
        throw new ValidationError(`Variant name(s) already exist: ${existingVariants.map((v) => v.variant_name).join(', ')}`);
      }

      // Check for duplicate variant values
      const variantValues = variantsData.filter((v) => v.variantValue).map((v) => v.variantValue);

      if (variantValues.length > 0) {
        const duplicateValues = variantValues.filter((value, index) => variantValues.indexOf(value) !== index);

        if (duplicateValues.length > 0) {
          throw new ValidationError(`Duplicate variant values: ${duplicateValues.join(', ')}`);
        }

        // Check existing variant values
        const existingValues = await ProductVariantModel.findAll({
          where: {
            variant_value: { [Op.in]: variantValues },
            status: 'ACTIVE',
          },
          attributes: [ 'variant_value' ],
          transaction,
        });

        if (existingValues.length > 0) {
          throw new ValidationError(`Variant value(s) already exist: ${existingValues.map((v) => v.variant_value).join(', ')}`);
        }
      }

      // Create all variants in parallel
      const variantPromises = variantsData.map(async (variantData) => {
        const {
          variantName, variantType, variantValue, price, sellingPrice, quantity,
          itemsPerUnit, units, itemQuantity, itemUnit, expiryDate, status: variantStatus,
        } = variantData;

        const variantConcurrencyStamp = uuidV4();

        const variantDoc = {
          productId: cat.id,
          variantName,
          variantType: variantType || null,
          variantValue: variantValue || null,
          price,
          sellingPrice,
          quantity: quantity || 0,
          itemsPerUnit: itemsPerUnit || null,
          units: units || null,
          itemQuantity: itemQuantity || null,
          itemUnit: itemUnit || null,
          expiryDate,
          productStatus: (quantity || 0) > 0 ? 'INSTOCK' : 'OUT-OF-STOCK',
          status: variantStatus || 'ACTIVE',
          concurrencyStamp: variantConcurrencyStamp,
          createdBy,
        };

        const variant = await ProductVariantModel.create(convertCamelToSnake(variantDoc), {
          transaction,
        });

        // Create inventory movement for variant (ADDED) in parallel
        const inventoryMovementPromise = variant.quantity > 0
          ? InventoryMovementService.createInventoryMovement({
            productId: cat.id,
            variantId: variant.id,
            vendorId: datas.vendorId,
            branchId,
            movementType: 'ADDED',
            quantityChange: variant.quantity,
            quantityBefore: 0,
            quantityAfter: variant.quantity,
            referenceType: 'PRODUCT',
            referenceId: cat.id,
            userId: createdBy,
            notes: 'Initial variant creation with product',
          })
          : Promise.resolve();

        await inventoryMovementPromise;

        return convertSnakeToCamel(variant.dataValues);
      });

      const createdVariantsResults = await Promise.all(variantPromises);

      createdVariants.push(...createdVariantsResults);
    }

    // Upload and create images if provided (imageFiles from multipart/form-data)
    const createdImages = [];

    if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0) {
      // Validate max images (10 per product)
      if (imageFiles.length > 10) {
        throw new ValidationError(`Maximum 10 images allowed per product. Received ${imageFiles.length} images.`);
      }

      // Check if there's already a default image
      const hasDefault = await ProductImageModel.findOne({
        where: {
          product_id: cat.id,
          variant_id: null,
          is_default: true,
          status: 'ACTIVE',
        },
        transaction,
      });

      // Get max display_order
      const maxDisplayOrder = await ProductImageModel.max('display_order', {
        where: {
          product_id: cat.id,
          variant_id: null,
          status: 'ACTIVE',
        },
        transaction,
      }) || 0;

      // Upload all images in parallel
      const baseTimestamp = Date.now();
      const uploadPromises = imageFiles.map((imgFile, i) => {
        const filename = `product-image-${cat.id}-main-${baseTimestamp}-${i}.jpg`;

        return uploadFile(imgFile, filename, datas.vendorId, branchId);
      });

      const uploadedImageUrls = await Promise.all(uploadPromises);

      // If first image should be default, unset other default images first
      if (!hasDefault && imageFiles.length > 0) {
        await ProductImageModel.update(
          { is_default: false },
          {
            where: {
              product_id: cat.id,
              variant_id: null,
              status: 'ACTIVE',
            },
            transaction,
          },
        );
      }

      // Create all image records in parallel
      const imageCreatePromises = uploadedImageUrls.map(async (uploadedImageUrl, i) => {
        const imageConcurrencyStamp = uuidV4();
        const isDefault = !hasDefault && i === 0; // First image is default if no default exists
        const displayOrder = maxDisplayOrder + i + 1;

        const imageDoc = {
          productId: cat.id,
          variantId: null,
          imageUrl: uploadedImageUrl,
          isDefault,
          displayOrder,
          concurrencyStamp: imageConcurrencyStamp,
          createdBy,
        };

        const image = await ProductImageModel.create(convertCamelToSnake(imageDoc), {
          transaction,
        });

        return convertSnakeToCamel(image.dataValues);
      });

      const createdImagesResults = await Promise.all(imageCreatePromises);

      createdImages.push(...createdImagesResults);

      // Images are now stored in product_image table, no need to update product.image
    }

    // Handle pre-uploaded image URLs (from imagesData array)
    if (imagesData && Array.isArray(imagesData) && imagesData.length > 0) {
      // Validate that all images have imageUrl
      const invalidImages = imagesData.filter((img) => !img.imageUrl);

      if (invalidImages.length > 0) {
        throw new ValidationError('All images in imagesData must have imageUrl');
      }

      // Check if there's already a default image (from imageFiles or existing)
      const hasDefault = await ProductImageModel.findOne({
        where: {
          product_id: cat.id,
          variant_id: null,
          is_default: true,
          status: 'ACTIVE',
        },
        transaction,
      }) || createdImages.some((img) => img.isDefault);

      // Get max display_order (from created images or existing)
      const existingMaxDisplayOrder = await ProductImageModel.max('display_order', {
        where: {
          product_id: cat.id,
          variant_id: null,
          status: 'ACTIVE',
        },
        transaction,
      }) || 0;

      const maxDisplayOrder = Math.max(
        existingMaxDisplayOrder,
        createdImages.length > 0 ? Math.max(...createdImages.map((img) => img.displayOrder || 0)) : 0,
      );

      // Group images by variantId to handle default image updates efficiently
      const variantGroups = new Map();

      imagesData.forEach((imgData, i) => {
        const variantKey = imgData.variantId || 'main';

        if (!variantGroups.has(variantKey)) {
          variantGroups.set(variantKey, []);
        }
        variantGroups.get(variantKey).push({ imgData, index: i });
      });

      // Unset default images for variants that will have new defaults
      const defaultUnsetPromises = [];

      imagesData.forEach((imgData, i) => {
        const isDefault = imgData.isDefault !== undefined ? imgData.isDefault : (!hasDefault && i === 0);

        if (isDefault) {
          defaultUnsetPromises.push(
            ProductImageModel.update(
              { is_default: false },
              {
                where: {
                  product_id: cat.id,
                  variant_id: imgData.variantId || null,
                  status: 'ACTIVE',
                },
                transaction,
              },
            ),
          );
        }
      });

      await Promise.all(defaultUnsetPromises);

      // Create all image records in parallel
      const imageCreatePromises = imagesData.map(async (imgData, i) => {
        const imageConcurrencyStamp = uuidV4();
        const isDefault = imgData.isDefault !== undefined ? imgData.isDefault : (!hasDefault && i === 0);
        const displayOrder = imgData.displayOrder !== undefined ? imgData.displayOrder : (maxDisplayOrder + i + 1);

        const imageDoc = {
          productId: cat.id,
          variantId: imgData.variantId || null,
          imageUrl: imgData.imageUrl,
          isDefault,
          displayOrder,
          concurrencyStamp: imageConcurrencyStamp,
          createdBy,
        };

        const image = await ProductImageModel.create(convertCamelToSnake(imageDoc), {
          transaction,
        });

        return convertSnakeToCamel(image.dataValues);
      });

      const createdImagesResults = await Promise.all(imageCreatePromises);

      createdImages.push(...createdImagesResults);

      // Images are now stored in product_image table, no need to update product.image
    }

    await transaction.commit();

    const productData = convertSnakeToCamel(cat.dataValues);

    productData.variants = createdVariants;
    productData.images = createdImages;

    return { doc: productData };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to save product');
  }
};

const updateProduct = async ({ data, imageFile, imageFiles }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const {
    concurrencyStamp, updatedBy, brandId, vendorId, variants: variantsData, imagesData, variantIdsToDelete, imageIdsToDelete,
  } = datas;

  const response = await ProductModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Product not found');
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
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
        throw new NotFoundError('Brand not found');
      }

      // Verify brand belongs to the same vendor as the product
      if (brand.vendor_id !== finalVendorId) {
        throw new ValidationError('Brand does not belong to the same vendor');
      }

      // Verify brand is active
      if (brand.status !== 'ACTIVE') {
        throw new ValidationError('Brand is not active');
      }
    }
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(data),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  // Handle legacy single image file (for backward compatibility)
  if (imageFile) {
    const filename = `product-${id}-${Date.now()}.jpg`;
    const branchId = response.branch_id;
    const imageVendorId = vendorId || response.vendor_id;

    const imageUrl = await uploadFile(imageFile, filename, imageVendorId, branchId);

    doc.image = imageUrl;
  }

  await ProductModel.update(doc, {
    where: { id },
    transaction,
  });

  // Handle variants: update existing, add new, delete marked
  const updatedVariants = [];

  if (variantsData && Array.isArray(variantsData) && variantsData.length > 0) {
    // Get existing variants for this product
    const existingVariants = await ProductVariantModel.findAll({
      where: { product_id: id, status: 'ACTIVE' },
      attributes: [ 'id', 'variant_name', 'variant_value', 'concurrency_stamp', 'quantity' ],
      transaction,
    });

    const existingVariantMap = new Map(existingVariants.map((v) => [ v.id, v ]));
    const variantIdsToUpdate = new Set();

    // Filter out deleted variants
    const validVariantsData = variantsData.filter((v) => !v.deleted);

    // Separate updates and creates
    const variantsToUpdate = validVariantsData.filter((v) => v.id);
    const variantsToCreate = validVariantsData.filter((v) => !v.id);

    // Validate all updates first (concurrency stamps)
    variantsToUpdate.forEach((variantData) => {
      const { id: variantId, concurrencyStamp: variantConcurrencyStamp } = variantData;
      const existingVariant = existingVariantMap.get(variantId);

      if (!existingVariant) {
        throw new ValidationError(`Variant with id ${variantId} not found`);
      }

      if (variantConcurrencyStamp !== existingVariant.concurrency_stamp) {
        throw new ValidationError(`Variant ${variantId}: invalid concurrency stamp`);
      }
    });

    // Batch all duplicate checks in parallel
    const duplicateCheckPromises = [
      ...variantsToUpdate.map((variantData) => {
        const { id: variantId, variantName, variantValue } = variantData;
        const checks = [];

        if (variantName) {
          checks.push(
            ProductVariantModel.findOne({
              where: {
                product_id: id,
                variant_name: variantName,
                id: { [Op.ne]: variantId },
                status: 'ACTIVE',
              },
              transaction,
            }).then((duplicate) => {
              if (duplicate) {
                throw new ValidationError(`Variant name "${variantName}" already exists`);
              }
            }),
          );
        }

        if (variantValue) {
          checks.push(
            ProductVariantModel.findOne({
              where: {
                variant_value: variantValue,
                id: { [Op.ne]: variantId },
                status: 'ACTIVE',
              },
              transaction,
            }).then((duplicate) => {
              if (duplicate) {
                throw new ValidationError(`Variant value "${variantValue}" already exists`);
              }
            }),
          );
        }

        return Promise.all(checks);
      }),
      ...variantsToCreate.map((variantData) => {
        const { variantName, variantValue } = variantData;
        const checks = [];

        if (variantName) {
          checks.push(
            ProductVariantModel.findOne({
              where: {
                product_id: id,
                variant_name: variantName,
                status: 'ACTIVE',
              },
              transaction,
            }).then((duplicate) => {
              if (duplicate) {
                throw new ValidationError(`Variant name "${variantName}" already exists`);
              }
            }),
          );
        }

        if (variantValue) {
          checks.push(
            ProductVariantModel.findOne({
              where: {
                variant_value: variantValue,
                status: 'ACTIVE',
              },
              transaction,
            }).then((duplicate) => {
              if (duplicate) {
                throw new ValidationError(`Variant value "${variantValue}" already exists`);
              }
            }),
          );
        }

        return Promise.all(checks);
      }),
    ];

    await Promise.all(duplicateCheckPromises.flat());

    // Process all updates in parallel
    const updatePromises = variantsToUpdate.map(async (variantData) => {
      const {
        id: variantId, variantName, variantType, variantValue, price, sellingPrice, quantity,
        itemsPerUnit, units, itemQuantity, itemUnit, expiryDate, status: variantStatus,
      } = variantData;

      const existingVariant = existingVariantMap.get(variantId);
      const variantConcurrencyStampNew = uuidV4();
      const oldVariantQuantity = existingVariant.quantity;
      const newVariantQuantity = quantity || 0;
      const quantityChange = newVariantQuantity - oldVariantQuantity;

      const variantUpdateDoc = {
        variantName,
        variantType: variantType || null,
        variantValue: variantValue || null,
        price,
        sellingPrice,
        quantity: newVariantQuantity,
        itemsPerUnit: itemsPerUnit || null,
        units: units || null,
        itemQuantity: itemQuantity || null,
        itemUnit: itemUnit || null,
        expiryDate,
        productStatus: newVariantQuantity > 0 ? 'INSTOCK' : 'OUT-OF-STOCK',
        status: variantStatus || 'ACTIVE',
        concurrencyStamp: variantConcurrencyStampNew,
        updatedBy,
      };

      await ProductVariantModel.update(convertCamelToSnake(variantUpdateDoc), {
        where: { id: variantId },
        transaction,
      });

      // Track inventory movement if quantity changed
      const inventoryPromise = quantityChange !== 0
        ? InventoryMovementService.createInventoryMovement({
          productId: id,
          variantId,
          vendorId: finalVendorId,
          branchId: response.branch_id,
          movementType: 'ADJUSTED',
          quantityChange,
          quantityBefore: oldVariantQuantity,
          quantityAfter: newVariantQuantity,
          referenceType: 'PRODUCT',
          referenceId: id,
          userId: updatedBy,
          notes: 'Variant quantity updated',
        })
        : Promise.resolve();

      await inventoryPromise;

      variantIdsToUpdate.add(variantId);

      return { id: variantId, concurrencyStamp: variantConcurrencyStampNew };
    });

    const updateResults = await Promise.all(updatePromises);

    updatedVariants.push(...updateResults);

    // Process all creates in parallel
    const createPromises = variantsToCreate.map(async (variantData) => {
      const {
        variantName, variantType, variantValue, price, sellingPrice, quantity,
        itemsPerUnit, units, itemQuantity, itemUnit, expiryDate, status: variantStatus,
      } = variantData;

      const variantConcurrencyStampNew = uuidV4();

      const variantDoc = {
        productId: id,
        variantName,
        variantType: variantType || null,
        variantValue: variantValue || null,
        price,
        sellingPrice,
        quantity: quantity || 0,
        itemsPerUnit: itemsPerUnit || null,
        units: units || null,
        itemQuantity: itemQuantity || null,
        itemUnit: itemUnit || null,
        expiryDate,
        productStatus: (quantity || 0) > 0 ? 'INSTOCK' : 'OUT-OF-STOCK',
        status: variantStatus || 'ACTIVE',
        concurrencyStamp: variantConcurrencyStampNew,
        createdBy: updatedBy,
      };

      const newVariant = await ProductVariantModel.create(convertCamelToSnake(variantDoc), {
        transaction,
      });

      // Create inventory movement for new variant (ADDED)
      const inventoryPromise = newVariant.quantity > 0
        ? InventoryMovementService.createInventoryMovement({
          productId: id,
          variantId: newVariant.id,
          vendorId: finalVendorId,
          branchId: response.branch_id,
          movementType: 'ADDED',
          quantityChange: newVariant.quantity,
          quantityBefore: 0,
          quantityAfter: newVariant.quantity,
          referenceType: 'PRODUCT',
          referenceId: id,
          userId: updatedBy,
          notes: 'Variant added during product update',
        })
        : Promise.resolve();

      await inventoryPromise;

      return { id: newVariant.id, concurrencyStamp: variantConcurrencyStampNew };
    });

    const createResults = await Promise.all(createPromises);

    updatedVariants.push(...createResults);

    // Delete variants marked in variantIdsToDelete array
    if (variantIdsToDelete && Array.isArray(variantIdsToDelete) && variantIdsToDelete.length > 0) {
      await ProductVariantModel.update(
        {
          status: 'INACTIVE',
          concurrency_stamp: uuidV4(),
        },
        {
          where: {
            id: { [Op.in]: variantIdsToDelete },
            product_id: id,
            status: 'ACTIVE',
          },
          transaction,
        },
      );
    }
  }

  // Handle images: update existing, add new (from files or URLs), delete marked
  const updatedImages = [];

  if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0) {
    // Validate max images
    const existingImageCount = await ProductImageModel.count({
      where: { product_id: id, variant_id: null, status: 'ACTIVE' },
      transaction,
    });

    if (existingImageCount + imageFiles.length > 10) {
      throw new ValidationError(`Cannot add ${imageFiles.length} images. Product already has ${existingImageCount} images. Maximum is 10.`);
    }

    // Check if there's already a default image
    const hasDefault = await ProductImageModel.findOne({
      where: {
        product_id: id,
        variant_id: null,
        is_default: true,
        status: 'ACTIVE',
      },
      transaction,
    });

    // Get max display_order
    const maxDisplayOrder = await ProductImageModel.max('display_order', {
      where: {
        product_id: id,
        variant_id: null,
        status: 'ACTIVE',
      },
      transaction,
    }) || 0;

    // Upload all images in parallel
    const baseTimestamp = Date.now();
    const imageBranchId = response.branch_id;
    const imageVendorId = vendorId || response.vendor_id;

    const uploadPromises = imageFiles.map((imgFile, i) => {
      const filename = `product-image-${id}-main-${baseTimestamp}-${i}.jpg`;

      return uploadFile(imgFile, filename, imageVendorId, imageBranchId);
    });

    const uploadedImageUrls = await Promise.all(uploadPromises);

    // If first image should be default, unset other default images first
    if (!hasDefault && imageFiles.length > 0) {
      await ProductImageModel.update(
        { is_default: false },
        {
          where: {
            product_id: id,
            variant_id: null,
            status: 'ACTIVE',
          },
          transaction,
        },
      );
    }

    // Create all image records in parallel
    const imageCreatePromises = uploadedImageUrls.map(async (uploadedImageUrl, i) => {
      const imageConcurrencyStamp = uuidV4();
      const isDefault = !hasDefault && i === 0; // First image is default if no default exists
      const displayOrder = maxDisplayOrder + i + 1;

      const imageDoc = {
        productId: id,
        variantId: null,
        imageUrl: uploadedImageUrl,
        isDefault,
        displayOrder,
        concurrencyStamp: imageConcurrencyStamp,
        createdBy: updatedBy,
      };

      const image = await ProductImageModel.create(convertCamelToSnake(imageDoc), {
        transaction,
      });

      return { id: image.id, concurrencyStamp: imageConcurrencyStamp };
    });

    const createdImagesResults = await Promise.all(imageCreatePromises);

    updatedImages.push(...createdImagesResults);
  }

  // Handle pre-uploaded image URLs (from imagesData array)
  if (imagesData && Array.isArray(imagesData) && imagesData.length > 0) {
    // Get existing images for this product
    const existingImages = await ProductImageModel.findAll({
      where: { product_id: id, variant_id: null, status: 'ACTIVE' },
      attributes: [ 'id', 'is_default', 'display_order', 'concurrency_stamp' ],
      transaction,
    });

    const existingImageMap = new Map(existingImages.map((img) => [ img.id, img ]));
    const maxDisplayOrder = Math.max(
      ...existingImages.map((img) => img.display_order || 0),
      updatedImages.length > 0 ? Math.max(...updatedImages.map((img) => img.displayOrder || 0)) : 0,
      0,
    );

    // Filter out deleted images
    const validImagesData = imagesData.filter((imgData) => !imgData.deleted);

    // Separate updates and creates
    const imagesToUpdate = validImagesData.filter((imgData) => imgData.id);
    const imagesToCreate = validImagesData.filter((imgData) => !imgData.id && imgData.imageUrl);

    // Batch unset default images for updates
    const defaultUnsetPromises = imagesToUpdate
      .filter((imgData) => imgData.isDefault === true)
      .map((imgData) => ProductImageModel.update(
        { is_default: false },
        {
          where: {
            product_id: id,
            variant_id: imgData.variantId || null,
            id: { [Op.ne]: imgData.id },
            status: 'ACTIVE',
          },
          transaction,
        },
      ));

    await Promise.all(defaultUnsetPromises);

    // Process all updates in parallel
    const updatePromises = imagesToUpdate.map(async (imgData) => {
      const {
        id: imageId, imageUrl, isDefault, displayOrder, variantId, status: imageStatus,
        concurrencyStamp: imageConcurrencyStamp,
      } = imgData;

      const existingImage = existingImageMap.get(imageId);

      if (!existingImage) {
        throw new ValidationError(`Image with id ${imageId} not found`);
      }

      // Validate concurrency stamp
      if (imageConcurrencyStamp && imageConcurrencyStamp !== existingImage.concurrency_stamp) {
        throw new ValidationError(`Image ${imageId}: invalid concurrency stamp`);
      }

      const imageConcurrencyStampNew = uuidV4();
      const updateImageData = {
        ...(imageUrl && { imageUrl }),
        ...(isDefault !== undefined && { isDefault }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(variantId !== undefined && { variantId: variantId || null }),
        ...(imageStatus !== undefined && { status: imageStatus }),
        concurrencyStamp: imageConcurrencyStampNew,
        updatedBy,
      };

      await ProductImageModel.update(convertCamelToSnake(updateImageData), {
        where: { id: imageId },
        transaction,
      });

      return { id: imageId, concurrencyStamp: imageConcurrencyStampNew };
    });

    const updatedImageResults = await Promise.all(updatePromises);

    updatedImages.push(...updatedImageResults);

    // Process creates: first batch count checks and default checks
    const variantIdsToCheck = [ ...new Set(imagesToCreate.map((img) => img.variantId || null)) ];
    const countChecks = await Promise.all(
      variantIdsToCheck.map((variantId) => ProductImageModel.count({
        where: { product_id: id, variant_id: variantId, status: 'ACTIVE' },
        transaction,
      })),
    );
    const countMap = new Map(variantIdsToCheck.map((vid, i) => [ vid, countChecks[i] ]));

    const defaultChecks = await Promise.all(
      variantIdsToCheck.map((variantId) => ProductImageModel.findOne({
        where: {
          product_id: id,
          variant_id: variantId,
          is_default: true,
          status: 'ACTIVE',
        },
        transaction,
      })),
    );
    const defaultMap = new Map(variantIdsToCheck.map((vid, i) => [ vid, !!defaultChecks[i] ]));

    // Batch unset default images for creates
    const createDefaultUnsetPromises = imagesToCreate
      .filter((imgData) => {
        const isDefaultValue = imgData.isDefault !== undefined
          ? imgData.isDefault
          : (!defaultMap.get(imgData.variantId || null) && countMap.get(imgData.variantId || null) === 0);

        return isDefaultValue;
      })
      .map((imgData) => ProductImageModel.update(
        { is_default: false },
        {
          where: {
            product_id: id,
            variant_id: imgData.variantId || null,
            status: 'ACTIVE',
          },
          transaction,
        },
      ));

    await Promise.all(createDefaultUnsetPromises);

    // Process all creates in parallel
    const createPromises = imagesToCreate.map(async (imgData, i) => {
      const {
        imageUrl, isDefault, displayOrder, variantId,
      } = imgData;

      const existingImageCount = countMap.get(variantId || null) || 0;

      if (existingImageCount >= 10) {
        throw new ValidationError('Maximum 10 images allowed per product');
      }

      const hasDefault = defaultMap.get(variantId || null);
      const imageConcurrencyStampNew = uuidV4();
      const isDefaultValue = isDefault !== undefined
        ? isDefault
        : (!hasDefault && existingImageCount === 0);
      const displayOrderValue = displayOrder !== undefined
        ? displayOrder
        : (maxDisplayOrder + i + 1);

      const imageDoc = {
        productId: id,
        variantId: variantId || null,
        imageUrl,
        isDefault: isDefaultValue,
        displayOrder: displayOrderValue,
        concurrencyStamp: imageConcurrencyStampNew,
        createdBy: updatedBy,
      };

      const image = await ProductImageModel.create(convertCamelToSnake(imageDoc), {
        transaction,
      });

      return { id: image.id, concurrencyStamp: imageConcurrencyStampNew };
    });

    const createdImageResults = await Promise.all(createPromises);

    updatedImages.push(...createdImageResults);
  }

  // Delete images marked in imageIdsToDelete array
  if (imageIdsToDelete && Array.isArray(imageIdsToDelete) && imageIdsToDelete.length > 0) {
    // Get images to delete
    const imagesToDelete = await ProductImageModel.findAll({
      where: {
        id: { [Op.in]: imageIdsToDelete },
        product_id: id,
        status: 'ACTIVE',
      },
      attributes: [ 'id', 'is_default', 'variant_id' ],
      transaction,
    });

    // Soft delete images
    await ProductImageModel.update(
      {
        status: 'INACTIVE',
        is_default: false,
        concurrency_stamp: uuidV4(),
      },
      {
        where: {
          id: { [Op.in]: imageIdsToDelete },
          product_id: id,
          status: 'ACTIVE',
        },
        transaction,
      },
    );

    // If deleted image was default, set another image as default (in parallel)
    const defaultImagePromises = imagesToDelete
      .filter((imageToDelete) => imageToDelete.is_default)
      .map(async (imageToDelete) => {
        const nextImage = await ProductImageModel.findOne({
          where: {
            product_id: id,
            variant_id: imageToDelete.variant_id || null,
            id: { [Op.ne]: imageToDelete.id },
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
      });

    await Promise.all(defaultImagePromises);
  }

  // Images are now stored in product_image table, no need to update product.image

  return {
    doc: {
      id,
      concurrencyStamp: newConcurrencyStamp,
      variants: updatedVariants,
      images: updatedImages,
    },
  };
}).catch((error) => handleServiceError(error, 'Failed to update product'));

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
        'status',
        'nutritional',
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
        {
          model: ProductVariantModel,
          as: 'variants',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: [
            'id',
            'variant_name',
            'variant_type',
            'variant_value',
            'price',
            'selling_price',
            'quantity',
            'item_quantity',
            'item_unit',
            'expiry_date',
            'product_status',
            'status',
          ],
        },
        {
          model: ProductImageModel,
          as: 'images',
          where: { status: 'ACTIVE', is_default: 1 },
          required: false,
          attributes: [ 'id', 'image_url', 'is_default', 'display_order', 'variant_id' ],
          order: [ [ 'display_order', 'ASC' ], [ 'is_default', 'DESC' ] ],
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

    // Convert image URLs to CloudFront URLs (automatically handles nested objects/arrays)
    // Include 'image_url' to convert product image URLs in the images array
    doc = convertImageFieldsToCloudFront(
      JSON.parse(JSON.stringify(dataValues)),
      [ 'image', 'logo', 'image_url' ],
    );

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
            'status',
            'nutritional',
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
            {
              model: ProductVariantModel,
              as: 'variants',
              where: { status: 'ACTIVE' },
              required: false,
              attributes: [
                'id',
                'variant_name',
                'variant_type',
                'variant_value',
                'price',
                'selling_price',
                'quantity',
                'item_quantity',
                'item_unit',
                'expiry_date',
                'product_status',
                'status',
              ],
            },
            {
              model: ProductImageModel,
              as: 'images',
              where: { status: 'ACTIVE', is_default: 1 },
              required: false,
              attributes: [ 'id', 'image_url', 'is_default', 'display_order', 'variant_id' ],
              order: [ [ 'display_order', 'ASC' ], [ 'is_default', 'DESC' ] ],
            },
          ],
        },
      ],
      distinct: true,
      order,
      limit,
      offset,
    },
  );

  let doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    // Convert image URLs to CloudFront URLs (automatically handles nested objects/arrays)
    // Include 'image_url' to convert product image URLs in the images array
    const dataValues = rows.map((element) => element.dataValues);

    doc = convertImageFieldsToCloudFront(dataValues, [ 'image', 'logo', 'image_url' ]);

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
}).catch((error) => handleServiceError(error, 'Failed to delete product'));

const getProductDetails = async (productId) => {
  try {
    const product = await ProductModel.findOne({
      where: { id: productId },
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
        'item_quantity',
        'item_unit',
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
          model: SubCategoryModel,
          as: 'subCategory',
          attributes: [ 'id', 'title', 'description', 'image', 'status' ],
        },
        {
          model: BrandModel,
          as: 'brand',
          attributes: [ 'id', 'name', 'logo', 'description', 'status' ],
          required: false,
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
        {
          model: ProductVariantModel,
          as: 'variants',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: [
            'id',
            'variant_name',
            'variant_type',
            'variant_value',
            'price',
            'selling_price',
            'quantity',
            'items_per_unit',
            'units',
            'item_quantity',
            'item_unit',
            'expiry_date',
            'product_status',
            'status',
            'concurrency_stamp',
            'created_at',
            'updated_at',
          ],
          order: [ [ 'variant_type', 'ASC' ], [ 'variant_name', 'ASC' ] ],
        },
        {
          model: ProductImageModel,
          as: 'images',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: [ 'id', 'image_url', 'is_default', 'display_order', 'variant_id', 'status' ],
          order: [ [ 'display_order', 'ASC' ], [ 'is_default', 'DESC' ] ],
        },
      ],
    });

    if (!product) {
      return handleServiceError(new NotFoundError('Product not found'));
    }

    // Get statistics
    const [ cartCount, wishlistCount, orderCount ] = await Promise.all([
      CartModel.count({
        where: { product_id: productId, status: 'ACTIVE' },
      }),
      WishlistModel.count({
        where: { product_id: productId },
      }),
      OrderItemModel.count({
        where: { product_id: productId },
      }),
    ]);

    // Get related products (same category, limit 6)
    const relatedProducts = await ProductModel.findAll({
      where: {
        category_id: product.category_id,
        id: { [Op.ne]: productId },
        status: 'ACTIVE',
      },
      attributes: [
        'id',
        'title',
        'status',
      ],
      include: [
        {
          model: BrandModel,
          as: 'brand',
          attributes: [ 'id', 'name', 'logo' ],
          required: false,
        },
        {
          model: ProductVariantModel,
          as: 'variants',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: [ 'id', 'selling_price', 'variant_name' ],
          limit: 1,
          order: [ [ 'created_at', 'ASC' ] ],
        },
        {
          model: ProductImageModel,
          as: 'images',
          where: { status: 'ACTIVE', is_default: 1 },
          required: false,
          attributes: [ 'id', 'image_url' ],
          limit: 1,
        },
      ],
      limit: 6,
      order: [ [ 'created_at', 'DESC' ] ],
    });

    const productData = product.dataValues;
    const statistics = {
      cart_count: cartCount,
      wishlist_count: wishlistCount,
      order_count: orderCount,
      total_sold: orderCount, // Can be enhanced with actual quantity sold
    };

    // Convert image URLs to CloudFront URLs
    // Include 'image_url' to convert product image URLs in the images array
    const convertedProduct = convertImageFieldsToCloudFront(
      [ productData ],
      [ 'image', 'logo', 'image_url' ],
    )[0];

    // Transform related products to include variant price and image
    const convertedRelated = relatedProducts.map((p) => {
      const relatedProductData = p.dataValues;
      const variant = relatedProductData.variants && relatedProductData.variants[0];
      const image = relatedProductData.images && relatedProductData.images[0];

      return {
        id: relatedProductData.id,
        title: relatedProductData.title,
        status: relatedProductData.status,
        selling_price: variant ? variant.selling_price : null,
        image: image ? image.image_url : null,
        brand: relatedProductData.brand,
      };
    });

    const convertedRelatedImages = convertImageFieldsToCloudFront(
      convertedRelated,
      [ 'image', 'logo', 'image_url' ],
    );

    return {
      doc: {
        ...convertedProduct,
        statistics,
        related_products: convertedRelatedImages,
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch product details');
  }
};

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  getProductDetails,
  deleteProduct,
};
