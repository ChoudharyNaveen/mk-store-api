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
  order: OrderModel,
  wishlist: WishlistModel,
  branch: BranchModel,
  productVariant: ProductVariantModel,
  productImage: ProductImageModel,
  variantComboDiscount: VariantComboDiscountModel,
  productType: ProductTypeModel,
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
const { calculateComboDiscountPricePerSet } = require('../utils/comboDiscountPrice');
const InventoryMovementService = require('./inventoryMovementService');
const { getProductStatusFromQuantity } = require('../utils/constants/productStatusConstants');
const { INVENTORY_MOVEMENT_TYPE } = require('../utils/constants/inventoryMovementTypeConstants');
const { ORDER_STATUS } = require('../utils/constants/orderStatusConstants');
const { COMBO_DISCOUNT_TYPE } = require('../utils/constants/comboDiscountTypeConstants');
const {
  NotFoundError,
  ValidationError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

// Helper function to batch validate combo discount concurrency stamps
const validateComboDiscountConcurrencyStampsBatch = async (comboDiscountsToUpdate, transaction) => {
  if (!comboDiscountsToUpdate || comboDiscountsToUpdate.length === 0) {
    return new Map();
  }

  const comboDiscountIds = comboDiscountsToUpdate.map((cd) => cd.id).filter(Boolean);

  if (comboDiscountIds.length === 0) {
    return new Map();
  }

  // Single query to fetch all combo discounts
  const comboDiscounts = await VariantComboDiscountModel.findAll({
    where: {
      id: { [Op.in]: comboDiscountIds },
    },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  // Return Map<comboDiscountId, concurrencyStamp> for quick lookup
  const concurrencyStampsMap = new Map();

  comboDiscounts.forEach((cd) => {
    concurrencyStampsMap.set(cd.id, cd.concurrency_stamp);
  });

  return concurrencyStampsMap;
};

// Helper function to validate combo discount data structure (without DB queries)
const validateComboDiscountData = (comboDiscountData) => {
  const {
    comboQuantity, discountType, discountValue, startDate, endDate,
  } = comboDiscountData;

  // Validate combo quantity
  if (!comboQuantity || comboQuantity < 1) {
    throw new ValidationError('Combo quantity must be at least 1');
  }

  // Validate discount type and value
  if (discountType === COMBO_DISCOUNT_TYPE.PERCENT) {
    if (!discountValue || discountValue < 1 || discountValue > 100) {
      throw new ValidationError('Discount percentage must be between 1 and 100');
    }
  } else if (discountType === COMBO_DISCOUNT_TYPE.FLATOFF) {
    if (!discountValue || discountValue <= 0) {
      throw new ValidationError('Discount amount must be greater than 0 for FLATOFF discount type');
    }
  } else {
    throw new ValidationError(`Discount type must be ${COMBO_DISCOUNT_TYPE.PERCENT} or ${COMBO_DISCOUNT_TYPE.FLATOFF}`);
  }

  // Validate date ranges
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new ValidationError('End date must be after start date');
    }
  }

  return true;
};

// Helper function to validate and create combo discount within transaction
const createComboDiscount = async (comboDiscountData, variantId, createdBy, transaction) => {
  const {
    comboQuantity, discountType, discountValue, startDate, endDate, status: comboStatus,
  } = comboDiscountData;

  // Validate combo discount data using helper function
  validateComboDiscountData(comboDiscountData);

  const concurrencyStamp = uuidV4();

  const doc = {
    variantId,
    comboQuantity,
    discountType,
    discountValue,
    startDate,
    endDate,
    concurrencyStamp,
    createdBy,
    status: comboStatus || 'ACTIVE',
  };

  const comboDiscount = await VariantComboDiscountModel.create(convertCamelToSnake(doc), {
    transaction,
  });

  return convertSnakeToCamel(comboDiscount.dataValues);
};

// Helper function to update combo discount within transaction
const updateComboDiscount = async (comboDiscountData, updatedBy, transaction) => {
  const {
    id, concurrencyStamp, comboQuantity, discountType, discountValue, startDate, endDate, status: comboStatus,
  } = comboDiscountData;

  const response = await VariantComboDiscountModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'variant_id', 'combo_quantity', 'discount_type', 'discount_value', 'start_date', 'end_date' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Variant combo discount not found');
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  // Validate combo discount data if any fields are being updated
  // Only validate fields that are actually being updated
  if (discountType !== undefined || discountValue !== undefined || comboQuantity !== undefined || startDate !== undefined || endDate !== undefined) {
    // Create a temporary object with all fields for validation
    // Use existing values from database if not being updated
    const validationData = {
      comboQuantity: comboQuantity !== undefined ? comboQuantity : response.combo_quantity,
      discountType: discountType !== undefined ? discountType : response.discount_type,
      discountValue: discountValue !== undefined ? discountValue : response.discount_value,
      startDate: startDate !== undefined ? startDate : response.start_date,
      endDate: endDate !== undefined ? endDate : response.end_date,
    };

    validateComboDiscountData(validationData);
  }

  const newConcurrencyStamp = uuidV4();
  const updateData = {};

  if (comboQuantity !== undefined) updateData.combo_quantity = comboQuantity;
  if (discountType !== undefined) updateData.discount_type = discountType;
  if (discountValue !== undefined) updateData.discount_value = discountValue;
  if (startDate !== undefined) updateData.start_date = startDate;
  if (endDate !== undefined) updateData.end_date = endDate;
  if (comboStatus !== undefined) updateData.status = comboStatus;

  updateData.updated_by = updatedBy;
  updateData.concurrency_stamp = newConcurrencyStamp;

  await VariantComboDiscountModel.update(updateData, {
    where: { id },
    transaction,
  });

  return { id, concurrencyStamp: newConcurrencyStamp };
};

// Helper function to delete combo discount (mark as INACTIVE) within transaction
const deleteComboDiscount = async (comboDiscountId, updatedBy, transaction) => {
  const comboDiscount = await VariantComboDiscountModel.findOne({
    where: { id: comboDiscountId },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!comboDiscount) {
    throw new NotFoundError('Variant combo discount not found');
  }

  const newConcurrencyStamp = uuidV4();

  await VariantComboDiscountModel.update(
    {
      status: 'INACTIVE',
      updated_by: updatedBy,
      concurrency_stamp: newConcurrencyStamp,
    },
    {
      where: { id: comboDiscountId },
      transaction,
    },
  );

  return { id: comboDiscountId, concurrencyStamp: newConcurrencyStamp };
};

const saveProduct = async ({ data, imageFiles }) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy, branchId, brandId, productTypeId, variants: variantsData, ...datas
  } = data;

  // Parallel validation: branch, brand, and product type checks (if needed)
  const validationPromises = [];

  if (branchId) {
    validationPromises.push(
      BranchModel.findOne({
        where: { id: branchId },
        attributes: [ 'id', 'vendor_id' ],
        transaction,
      }),
    );
  } else {
    validationPromises.push(Promise.resolve(null));
  }

  if (brandId) {
    validationPromises.push(
      BrandModel.findOne({
        where: { id: brandId },
        attributes: [ 'id', 'vendor_id', 'branch_id', 'status' ],
        transaction,
      }),
    );
  } else {
    validationPromises.push(Promise.resolve(null));
  }

  if (productTypeId) {
    validationPromises.push(
      ProductTypeModel.findOne({
        where: { id: productTypeId },
        attributes: [ 'id', 'sub_category_id', 'status' ],
        transaction,
      }),
    );
  } else {
    validationPromises.push(Promise.resolve(null));
  }

  const [ branch, brand, productType ] = await Promise.all(validationPromises);

  // Validate branch
  if (branchId) {
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    datas.vendorId = branch.vendor_id;
    datas.branchId = branchId;
  }

  // Validate brand
  if (brandId) {
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }

    if (brand.vendor_id !== datas.vendorId) {
      throw new ValidationError('Brand does not belong to the same vendor');
    }

    if (brand.status !== 'ACTIVE') {
      throw new ValidationError('Brand is not active');
    }

    datas.brandId = brandId;
  }

  // Validate product type: must exist and belong to same subcategory as product
  if (productTypeId) {
    if (!productType) {
      throw new NotFoundError('Product type not found');
    }

    if (productType.status !== 'ACTIVE') {
      throw new ValidationError('Product type is not active');
    }

    const productSubCategoryId = datas.subCategoryId;

    if (!productSubCategoryId) {
      throw new ValidationError('subCategoryId is required when productTypeId is provided');
    }

    if (productType.sub_category_id !== parseInt(productSubCategoryId)) {
      throw new ValidationError('Product type does not belong to the selected subcategory');
    }

    datas.productTypeId = productTypeId;
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

  // Create variants if provided (within the same transaction)
  const createdVariants = [];

  // Validate: at least one variant is mandatory
  if (!variantsData || !Array.isArray(variantsData) || variantsData.length === 0) {
    throw new ValidationError('At least one variant is required');
  }

  if (variantsData && Array.isArray(variantsData) && variantsData.length > 0) {
    // Fast validation: duplicate names in input
    const variantNames = variantsData.map((v) => v.variantName);

    if (new Set(variantNames).size !== variantNames.length) {
      throw new ValidationError('Duplicate variant names are not allowed');
    }

    // Validate all combo discount data in-memory before creating variants
    variantsData.forEach((variantData) => {
      if (variantData.comboDiscounts && Array.isArray(variantData.comboDiscounts)) {
        variantData.comboDiscounts.forEach((comboDiscountData) => {
          validateComboDiscountData(comboDiscountData);
        });
      }
    });

    // Create all variants in parallel
    const variantPromises = variantsData.map(async (variantData) => {
      const {
        variantName, description, nutritional, price, sellingPrice, quantity,
        itemsPerUnit, units, itemQuantity, itemUnit, expiryDate, status: variantStatus,
        comboDiscounts,
      } = variantData;

      const variantConcurrencyStamp = uuidV4();

      const variantDoc = {
        productId: cat.id,
        variantName,
        description: description || null,
        nutritional: nutritional || null,
        price,
        sellingPrice,
        quantity: quantity || 0,
        itemsPerUnit: itemsPerUnit || null,
        units: units || null,
        itemQuantity: itemQuantity || null,
        itemUnit: itemUnit || null,
        expiryDate,
        productStatus: getProductStatusFromQuantity(quantity),
        status: variantStatus || 'ACTIVE',
        concurrencyStamp: variantConcurrencyStamp,
        createdBy,
      };

      const variant = await ProductVariantModel.create(convertCamelToSnake(variantDoc), {
        transaction,
      });

      // Create inventory movement for variant (ADDED) in parallel
      const inventoryMovementPromise = InventoryMovementService.createInventoryMovement({
        productId: cat.id,
        variantId: variant.id,
        vendorId: datas.vendorId,
        branchId,
        movementType: INVENTORY_MOVEMENT_TYPE.ADDED,
        quantityChange: variant.quantity,
        quantityBefore: 0,
        quantityAfter: variant.quantity,
        referenceType: 'PRODUCT',
        referenceId: cat.id,
        userId: createdBy,
        notes: 'Initial variant creation with product',
      }, transaction);

      await inventoryMovementPromise;

      const variantResult = convertSnakeToCamel(variant.dataValues);

      // Store combo discounts data for batch creation after all variants are created
      variantResult.comboDiscountsData = comboDiscounts || [];
      variantResult.variantId = variant.id;

      return variantResult;
    });

    const createdVariantsResults = await Promise.all(variantPromises);

    // Batch create all combo discounts after all variants are created
    const comboDiscountCreatePromises = [];

    createdVariantsResults.forEach((variantResult) => {
      if (variantResult.comboDiscountsData && Array.isArray(variantResult.comboDiscountsData) && variantResult.comboDiscountsData.length > 0) {
        variantResult.comboDiscountsData.forEach((comboDiscountData) => {
          comboDiscountCreatePromises.push(
            createComboDiscount(comboDiscountData, variantResult.variantId, createdBy, transaction),
          );
        });
      }
    });

    const comboDiscountResults = await Promise.all(comboDiscountCreatePromises);

    // Map combo discounts back to their variants
    let comboDiscountIndex = 0;

    createdVariantsResults.forEach((variantResult) => {
      const comboDiscountsForVariant = [];

      if (variantResult.comboDiscountsData && Array.isArray(variantResult.comboDiscountsData)) {
        for (let i = 0; i < variantResult.comboDiscountsData.length; i += 1) {
          comboDiscountsForVariant.push(comboDiscountResults[comboDiscountIndex]);
          comboDiscountIndex += 1;
        }
      }

      // eslint-disable-next-line no-param-reassign
      variantResult.comboDiscounts = comboDiscountsForVariant;
      // eslint-disable-next-line no-param-reassign
      delete variantResult.comboDiscountsData;
      // eslint-disable-next-line no-param-reassign
      delete variantResult.variantId;
    });

    createdVariants.push(...createdVariantsResults);
  }

  // Upload and create images if provided (imageFiles from multipart/form-data)
  const createdImages = [];

  if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0) {
    // Upload all images to S3 in parallel
    const baseTimestamp = Date.now();
    const uploadPromises = imageFiles.map((imgFile, i) => {
      const filename = `product-image-${cat.id}-main-${baseTimestamp}-${i}.jpg`;

      return uploadFile(imgFile, filename, datas.vendorId, branchId);
    });

    const uploadedImageUrls = await Promise.all(uploadPromises);

    // Create all image records in parallel - first image is default
    const imageCreatePromises = uploadedImageUrls.map(async (uploadedImageUrl, i) => {
      const imageConcurrencyStamp = uuidV4();
      const isDefault = i === 0; // First image is always default
      const displayOrder = i + 1;

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
  }

  const productData = convertSnakeToCamel(cat.dataValues);

  productData.variants = createdVariants;
  productData.images = createdImages;

  return { doc: productData };
}).catch((error) => handleServiceError(error, 'Failed to save product'));

const updateProduct = async ({ data, imageFiles }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const {
    concurrencyStamp, updatedBy, brandId, vendorId, productTypeId, variants: variantsData, imagesData, variantIdsToDelete, imageIdsToDelete,
  } = datas;

  const response = await ProductModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id', 'sub_category_id' ],
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

  // Validate product type: must exist and belong to same subcategory as product
  if (productTypeId !== undefined) {
    const finalSubCategoryId = datas.subCategoryId !== undefined ? datas.subCategoryId : response.sub_category_id;

    if (productTypeId === null) {
      datas.productTypeId = null;
    } else {
      const productType = await ProductTypeModel.findOne({
        where: { id: productTypeId },
        attributes: [ 'id', 'sub_category_id', 'status' ],
        transaction,
      });

      if (!productType) {
        throw new NotFoundError('Product type not found');
      }

      if (productType.status !== 'ACTIVE') {
        throw new ValidationError('Product type is not active');
      }

      if (productType.sub_category_id !== parseInt(finalSubCategoryId)) {
        throw new ValidationError('Product type does not belong to the product subcategory');
      }
    }
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(data),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

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
      attributes: [ 'id', 'variant_name', 'concurrency_stamp', 'quantity' ],
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
        const { id: variantId, variantName } = variantData;
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

        return Promise.all(checks);
      }),
      ...variantsToCreate.map((variantData) => {
        const { variantName } = variantData;
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

        return Promise.all(checks);
      }),
    ];

    await Promise.all(duplicateCheckPromises.flat());

    // Collect all combo discounts from all variants for batch validation
    const allComboDiscountsToUpdate = [];
    const allComboDiscountsToCreate = [];

    variantsToUpdate.forEach((variantData) => {
      if (variantData.comboDiscounts && Array.isArray(variantData.comboDiscounts)) {
        const comboDiscountsToUpdate = variantData.comboDiscounts.filter((cd) => cd.id && !cd.deleted);
        const comboDiscountsToCreate = variantData.comboDiscounts.filter((cd) => !cd.id && !cd.deleted);

        allComboDiscountsToUpdate.push(...comboDiscountsToUpdate);
        allComboDiscountsToCreate.push(...comboDiscountsToCreate);
      }
    });

    variantsToCreate.forEach((variantData) => {
      if (variantData.comboDiscounts && Array.isArray(variantData.comboDiscounts)) {
        const comboDiscountsToCreate = variantData.comboDiscounts.filter((cd) => !cd.deleted);

        allComboDiscountsToCreate.push(...comboDiscountsToCreate);
      }
    });

    // Batch validate combo discount concurrency stamps
    const concurrencyStampsMap = await validateComboDiscountConcurrencyStampsBatch(allComboDiscountsToUpdate, transaction);

    // Validate all combo discount data in-memory
    allComboDiscountsToUpdate.forEach((comboDiscountData) => {
      // Validate concurrency stamp
      const expectedStamp = concurrencyStampsMap.get(comboDiscountData.id);

      if (!expectedStamp) {
        throw new NotFoundError(`Variant combo discount with id ${comboDiscountData.id} not found`);
      }

      if (comboDiscountData.concurrencyStamp !== expectedStamp) {
        throw new ConcurrencyError('invalid concurrency stamp');
      }

      // Validate data structure
      validateComboDiscountData(comboDiscountData);
    });

    allComboDiscountsToCreate.forEach((comboDiscountData) => {
      validateComboDiscountData(comboDiscountData);
    });

    // Process all updates in parallel
    const updatePromises = variantsToUpdate.map(async (variantData) => {
      const {
        id: variantId, variantName, description, nutritional, price, sellingPrice, quantity,
        itemsPerUnit, units, itemQuantity, itemUnit, expiryDate, status: variantStatus,
        comboDiscounts,
      } = variantData;

      const existingVariant = existingVariantMap.get(variantId);
      const variantConcurrencyStampNew = uuidV4();
      const oldVariantQuantity = existingVariant.quantity;
      const newVariantQuantity = quantity || 0;
      const quantityChange = newVariantQuantity - oldVariantQuantity;

      const variantUpdateDoc = {
        variantName,
        description: description !== undefined ? description : null,
        nutritional: nutritional !== undefined ? nutritional : null,
        price,
        sellingPrice,
        quantity: newVariantQuantity,
        itemsPerUnit: itemsPerUnit || null,
        units: units || null,
        itemQuantity: itemQuantity || null,
        itemUnit: itemUnit || null,
        expiryDate,
        productStatus: getProductStatusFromQuantity(newVariantQuantity),
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
          movementType: INVENTORY_MOVEMENT_TYPE.ADJUSTED,
          quantityChange,
          quantityBefore: oldVariantQuantity,
          quantityAfter: newVariantQuantity,
          referenceType: 'PRODUCT',
          referenceId: id,
          userId: updatedBy,
          notes: 'Variant quantity updated',
        }, transaction)
        : Promise.resolve();

      await inventoryPromise;

      // Store combo discount operations for batch execution after all variants are updated
      const comboDiscountsForVariant = comboDiscounts && Array.isArray(comboDiscounts) ? comboDiscounts : [];
      const comboDiscountsToUpdate = comboDiscountsForVariant.filter((cd) => cd.id && !cd.deleted);
      const comboDiscountsToCreate = comboDiscountsForVariant.filter((cd) => !cd.id && !cd.deleted);
      const comboDiscountsToDelete = comboDiscountsForVariant.filter((cd) => cd.deleted || (cd.id && cd.deleted === true));

      variantIdsToUpdate.add(variantId);

      return {
        id: variantId,
        concurrencyStamp: variantConcurrencyStampNew,
        comboDiscountsToUpdate: comboDiscountsToUpdate.map((cd) => ({ ...cd, variantId })),
        comboDiscountsToCreate: comboDiscountsToCreate.map((cd) => ({ ...cd, variantId })),
        comboDiscountsToDelete: comboDiscountsToDelete.filter((cd) => cd.id).map((cd) => ({ id: cd.id, variantId })),
      };
    });

    const updateResults = await Promise.all(updatePromises);

    updatedVariants.push(...updateResults);

    // Process all creates in parallel
    const createPromises = variantsToCreate.map(async (variantData) => {
      const {
        variantName, description, nutritional, price, sellingPrice, quantity,
        itemsPerUnit, units, itemQuantity, itemUnit, expiryDate, status: variantStatus,
        comboDiscounts,
      } = variantData;

      const variantConcurrencyStampNew = uuidV4();

      const variantDoc = {
        productId: id,
        variantName,
        description: description || null,
        nutritional: nutritional || null,
        price,
        sellingPrice,
        quantity: quantity || 0,
        itemsPerUnit: itemsPerUnit || null,
        units: units || null,
        itemQuantity: itemQuantity || null,
        itemUnit: itemUnit || null,
        expiryDate,
        productStatus: getProductStatusFromQuantity(quantity),
        status: variantStatus || 'ACTIVE',
        concurrencyStamp: variantConcurrencyStampNew,
        createdBy: updatedBy,
      };

      const newVariant = await ProductVariantModel.create(convertCamelToSnake(variantDoc), {
        transaction,
      });

      // Create inventory movement for new variant (ADDED)
      const inventoryPromise = InventoryMovementService.createInventoryMovement({
        productId: id,
        variantId: newVariant.id,
        vendorId: finalVendorId,
        branchId: response.branch_id,
        movementType: INVENTORY_MOVEMENT_TYPE.ADDED,
        quantityChange: newVariant.quantity,
        quantityBefore: 0,
        quantityAfter: newVariant.quantity,
        referenceType: 'PRODUCT',
        referenceId: id,
        userId: updatedBy,
        notes: 'Variant added during product update',
      }, transaction);

      await inventoryPromise;

      // Store combo discount operations for batch execution after all variants are created
      const comboDiscountsForVariant = comboDiscounts && Array.isArray(comboDiscounts) ? comboDiscounts.filter((cd) => !cd.deleted) : [];

      return {
        id: newVariant.id,
        concurrencyStamp: variantConcurrencyStampNew,
        comboDiscountsToCreate: comboDiscountsForVariant.map((cd) => ({ ...cd, variantId: newVariant.id })),
      };
    });

    const createResults = await Promise.all(createPromises);

    updatedVariants.push(...createResults);

    // Batch execute all combo discount operations in parallel
    const comboDiscountOperations = [];

    // Collect all combo discount operations from update results
    updateResults.forEach((result) => {
      if (result.comboDiscountsToUpdate) {
        result.comboDiscountsToUpdate.forEach((cd) => {
          comboDiscountOperations.push({
            type: 'update',
            data: cd,
          });
        });
      }

      if (result.comboDiscountsToCreate) {
        result.comboDiscountsToCreate.forEach((cd) => {
          comboDiscountOperations.push({
            type: 'create',
            data: cd,
          });
        });
      }

      if (result.comboDiscountsToDelete) {
        result.comboDiscountsToDelete.forEach((cd) => {
          comboDiscountOperations.push({
            type: 'delete',
            data: cd,
          });
        });
      }
    });

    // Collect all combo discount operations from create results
    createResults.forEach((result) => {
      if (result.comboDiscountsToCreate) {
        result.comboDiscountsToCreate.forEach((cd) => {
          comboDiscountOperations.push({
            type: 'create',
            data: cd,
          });
        });
      }
    });

    // Execute all combo discount operations in parallel
    const comboDiscountPromises = comboDiscountOperations.map(async (op) => {
      if (op.type === 'update') {
        return updateComboDiscount(op.data, updatedBy, transaction);
      }

      if (op.type === 'create') {
        return createComboDiscount(op.data, op.data.variantId, updatedBy, transaction);
      }

      if (op.type === 'delete') {
        return deleteComboDiscount(op.data.id, updatedBy, transaction);
      }

      return null;
    });

    const comboDiscountResults = await Promise.all(comboDiscountPromises);

    // Map combo discounts back to their variants
    let comboDiscountIndex = 0;

    // eslint-disable-next-line no-param-reassign
    updateResults.forEach((result) => {
      const comboDiscounts = [];

      if (result.comboDiscountsToUpdate) {
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < result.comboDiscountsToUpdate.length; i += 1) {
          comboDiscounts.push(comboDiscountResults[comboDiscountIndex]);
          // eslint-disable-next-line no-plusplus
          comboDiscountIndex += 1;
        }
      }

      if (result.comboDiscountsToCreate) {
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < result.comboDiscountsToCreate.length; i += 1) {
          comboDiscounts.push(comboDiscountResults[comboDiscountIndex]);
          // eslint-disable-next-line no-plusplus
          comboDiscountIndex += 1;
        }
      }

      // Delete operations don't return results, so skip them
      if (result.comboDiscountsToDelete) {
        comboDiscountIndex += result.comboDiscountsToDelete.length;
      }

      // eslint-disable-next-line no-param-reassign
      result.comboDiscounts = comboDiscounts;
      // eslint-disable-next-line no-param-reassign
      delete result.comboDiscountsToUpdate;
      // eslint-disable-next-line no-param-reassign
      delete result.comboDiscountsToCreate;
      // eslint-disable-next-line no-param-reassign
      delete result.comboDiscountsToDelete;
    });

    // eslint-disable-next-line no-param-reassign
    createResults.forEach((result) => {
      const comboDiscounts = [];

      if (result.comboDiscountsToCreate) {
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < result.comboDiscountsToCreate.length; i += 1) {
          comboDiscounts.push(comboDiscountResults[comboDiscountIndex]);
          // eslint-disable-next-line no-plusplus
          comboDiscountIndex += 1;
        }
      }

      // eslint-disable-next-line no-param-reassign
      result.comboDiscounts = comboDiscounts;
      // eslint-disable-next-line no-param-reassign
      delete result.comboDiscountsToCreate;
    });

    // Delete variants marked in variantIdsToDelete array
    if (variantIdsToDelete && Array.isArray(variantIdsToDelete) && variantIdsToDelete.length > 0) {
      // Mark all associated combo discounts as INACTIVE when variant is deleted
      await VariantComboDiscountModel.update(
        {
          status: 'INACTIVE',
          updated_by: updatedBy,
          concurrency_stamp: uuidV4(),
        },
        {
          where: {
            variant_id: { [Op.in]: variantIdsToDelete },
            status: 'ACTIVE',
          },
          transaction,
        },
      );

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

    // Validate: at least one variant must remain after all operations
    // Calculate remaining count from existing variants map and operations instead of querying
    let remainingVariantsCount = existingVariants.length;

    // Subtract variants being deleted
    if (variantIdsToDelete && Array.isArray(variantIdsToDelete)) {
      remainingVariantsCount -= variantIdsToDelete.length;
    }

    // Subtract variants being updated that are being deleted (if any)
    variantsToUpdate.forEach((variantData) => {
      if (variantData.deleted) {
        remainingVariantsCount -= 1;
      }
    });

    // Add variants being created
    remainingVariantsCount += variantsToCreate.length;

    if (remainingVariantsCount === 0) {
      throw new ValidationError('At least one variant is required. Cannot delete all variants.');
    }
  } else if (variantIdsToDelete && Array.isArray(variantIdsToDelete) && variantIdsToDelete.length > 0) {
    // If only deleting variants without adding/updating, check remaining count
    // Get existing variants count to calculate remaining
    const existingVariantsForCount = await ProductVariantModel.findAll({
      where: { product_id: id, status: 'ACTIVE' },
      attributes: [ 'id' ],
      transaction,
    });

    const existingVariantsCount = existingVariantsForCount.length;

    if (existingVariantsCount <= variantIdsToDelete.length) {
      throw new ValidationError('At least one variant is required. Cannot delete all variants.');
    }

    // Mark all associated combo discounts as INACTIVE when variant is deleted
    await VariantComboDiscountModel.update(
      {
        status: 'INACTIVE',
        updated_by: updatedBy,
        concurrency_stamp: uuidV4(),
      },
      {
        where: {
          variant_id: { [Op.in]: variantIdsToDelete },
          status: 'ACTIVE',
        },
        transaction,
      },
    );

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

  // Handle images: update existing, add new (from files or URLs), delete marked
  const updatedImages = [];

  if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0) {
    // Simple check: total images cannot exceed 3
    const existingImageCount = await ProductImageModel.count({
      where: { product_id: id, variant_id: null, status: 'ACTIVE' },
      transaction,
    });

    if (existingImageCount + imageFiles.length > 3) {
      throw new ValidationError(`Cannot add ${imageFiles.length} images. Product already has ${existingImageCount} images. Maximum is 3.`);
    }

    // Upload all images in parallel
    const baseTimestamp = Date.now();
    const imageBranchId = response.branch_id;
    const imageVendorId = vendorId || response.vendor_id;

    const uploadPromises = imageFiles.map((imgFile, i) => {
      const filename = `product-image-${id}-main-${baseTimestamp}-${i}.jpg`;

      return uploadFile(imgFile, filename, imageVendorId, imageBranchId);
    });

    const uploadedImageUrls = await Promise.all(uploadPromises);

    // Unset all existing default images if adding new images
    if (imageFiles.length > 0) {
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

    // Create all image records in parallel - first image is default
    const imageCreatePromises = uploadedImageUrls.map(async (uploadedImageUrl, i) => {
      const imageConcurrencyStamp = uuidV4();
      const isDefault = i === 0; // First image is always default
      const displayOrder = existingImageCount + i + 1;

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
    // Get existing images once
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

    // Check total images won't exceed 3
    const totalAfterCreate = existingImages.length - imagesToUpdate.length + imagesToCreate.length;

    if (totalAfterCreate > 3) {
      throw new ValidationError(`Cannot add ${imagesToCreate.length} images. Maximum is 3 images per product.`);
    }

    // Unset default for images being set as default
    const imagesToSetAsDefault = imagesToUpdate.filter((img) => img.isDefault === true)
      .concat(imagesToCreate.filter((img) => img.isDefault !== false));

    if (imagesToSetAsDefault.length > 0) {
      await ProductImageModel.update(
        { is_default: false },
        {
          where: {
            product_id: id,
            variant_id: null,
            id: { [Op.notIn]: imagesToSetAsDefault.map((img) => img.id).filter(Boolean) },
            status: 'ACTIVE',
          },
          transaction,
        },
      );
    }

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

    // Process all creates in parallel - simplified
    const hasDefault = existingImages.some((img) => img.is_default) || imagesToUpdate.some((img) => img.isDefault === true);
    const createPromises = imagesToCreate.map(async (imgData, i) => {
      const {
        imageUrl, isDefault, displayOrder, variantId,
      } = imgData;

      const imageConcurrencyStampNew = uuidV4();
      const isDefaultValue = isDefault !== undefined ? isDefault : (!hasDefault && i === 0);
      const displayOrderValue = displayOrder !== undefined ? displayOrder : (maxDisplayOrder + i + 1);

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

/**
 * Get product IDs that have at least one variant with an active (status + date-valid) combo discount.
 * @returns {Promise<number[]>}
 */
const getProductIdsWithActiveComboDiscount = async () => {
  const now = new Date();
  const rows = await VariantComboDiscountModel.findAll({
    where: {
      status: 'ACTIVE',
      start_date: { [Op.lte]: now },
      end_date: { [Op.gte]: now },
    },
    include: [
      {
        model: ProductVariantModel,
        as: 'variant',
        attributes: [ 'product_id' ],
      },
    ],
    attributes: [],
  });

  const productIds = [ ...new Set(rows.map((r) => r.variant && r.variant.product_id).filter(Boolean)) ];

  return productIds;
};

const getProduct = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting, hasActiveComboDiscounts,
  } = payload;

  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  let where = generateWhereCondition(filters, ProductModel);

  if (hasActiveComboDiscounts) {
    const productIds = await getProductIdsWithActiveComboDiscount();

    if (productIds.length === 0) {
      return { count: 0, totalCount: 0, doc: [] };
    }
    where = { ...where, id: { [Op.in]: productIds } };
  }

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
        'status',
        'concurrency_stamp',
        'created_at',
      ],
      include: [
        {
          model: CategoryModel,
          as: 'category',
          attributes: [ 'id', 'title' ],
        },
        {
          model: SubCategoryModel,
          as: 'subCategory',
          attributes: [ 'id', 'title' ],
        },
        {
          model: BrandModel,
          as: 'brand',
          attributes: [ 'id', 'name' ],
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
            'price',
            'selling_price',
            'quantity',
            'item_quantity',
            'item_unit',
            'items_per_unit',
            'units',
            'expiry_date',
            'product_status',
            'status',
            'concurrency_stamp',
          ],
          include: [
            {
              model: VariantComboDiscountModel,
              as: 'comboDiscounts',
              where: { status: 'ACTIVE' },
              required: false,
              attributes: [
                'id',
                'combo_quantity',
                'discount_type',
                'discount_value',
                'start_date',
                'end_date',
                'status',
                'concurrency_stamp',
              ],
            },
          ],
        },
        {
          model: ProductImageModel,
          as: 'images',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: [ 'id', 'image_url', 'is_default', 'display_order', 'variant_id', 'concurrency_stamp' ],
          order: [ [ 'is_default', 'DESC' ] ],
        },
        {
          model: ProductTypeModel,
          as: 'productType',
          attributes: [ 'id', 'title' ],
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

    // Convert image URLs to CloudFront URLs (automatically handles nested objects/arrays)
    // Include 'image_url' to convert product image URLs in the images array
    doc = convertImageFieldsToCloudFront(
      JSON.parse(JSON.stringify(dataValues)),
      [ 'image', 'logo', 'image_url' ],
    );

    // Add discount_price to comboDiscounts (price for ONE combo set)
    for (let p = 0; p < doc.length; p += 1) {
      const variants = doc[p].variants || [];

      for (let v = 0; v < variants.length; v += 1) {
        const sellingPrice = variants[v].selling_price;
        const cds = variants[v].comboDiscounts || [];

        variants[v].comboDiscounts = cds.map((cd) => ({
          ...cd,
          discount_price: calculateComboDiscountPricePerSet({
            sellingPrice,
            comboQuantity: cd.combo_quantity,
            discountType: cd.discount_type,
            discountValue: cd.discount_value,
          }),
        }));
      }
    }

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

/**
 * Escape special characters for SQL LIKE (%, _) so user input is treated literally
 * @param {string} str - Raw search string
 * @returns {string}
 */
const escapeLikePattern = (str) => {
  if (typeof str !== 'string') return '';

  return str
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
};

/**
 * Fuzzy search products by title (case-insensitive LIKE %query%).
 * Optional filters: branchId, vendorId, categoryId, subCategoryId.
 * @param {Object} payload
 * @param {string} payload.searchQuery - Search term (matched against product title)
 * @param {number} [payload.pageSize]
 * @param {number} [payload.pageNumber]
 * @param {number} [payload.branchId]
 * @param {number} [payload.vendorId]
 * @param {number} [payload.categoryId]
 * @param {number} [payload.subCategoryId]
 * @returns {Promise<{ count, totalCount, doc }>}
 */
const searchProducts = async (payload) => {
  const {
    searchQuery, pageSize, pageNumber, branchId, vendorId, categoryId, subCategoryId,
  } = payload;

  const { limit, offset } = calculatePagination(pageSize || 10, pageNumber || 1);

  const escaped = escapeLikePattern((searchQuery || '').trim());

  if (!escaped) {
    return { count: 0, totalCount: 0, doc: [] };
  }

  const likePattern = `%${escaped}%`;

  const where = {
    status: 'ACTIVE',
    title: { [Op.like]: likePattern },
  };

  if (branchId != null) where.branch_id = branchId;
  if (vendorId != null) where.vendor_id = vendorId;
  if (categoryId != null) where.category_id = categoryId;
  if (subCategoryId != null) where.sub_category_id = subCategoryId;

  const order = [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    ProductModel,
    {
      where: { ...where },
      attributes: [
        'id',
        'title',
        'status',
        'concurrency_stamp',
        'created_at',
      ],
      include: [
        {
          model: CategoryModel,
          as: 'category',
          attributes: [ 'id', 'title' ],
        },
        {
          model: SubCategoryModel,
          as: 'subCategory',
          attributes: [ 'id', 'title' ],
        },
        {
          model: BrandModel,
          as: 'brand',
          attributes: [ 'id', 'name' ],
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
            'price',
            'selling_price',
            'quantity',
            'item_quantity',
            'item_unit',
            'items_per_unit',
            'units',
            'expiry_date',
            'product_status',
            'status',
          ],
          include: [
            {
              model: VariantComboDiscountModel,
              as: 'comboDiscounts',
              where: { status: 'ACTIVE' },
              required: false,
              attributes: [
                'id',
                'combo_quantity',
                'discount_type',
                'discount_value',
                'start_date',
                'end_date',
                'status',
              ],
            },
          ],
        },
        {
          model: ProductImageModel,
          as: 'images',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: [ 'id', 'image_url', 'is_default', 'display_order', 'variant_id' ],
          order: [ [ 'is_default', 'DESC' ] ],
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

    doc = convertImageFieldsToCloudFront(
      JSON.parse(JSON.stringify(dataValues)),
      [ 'image', 'logo', 'image_url' ],
    );

    for (let p = 0; p < doc.length; p += 1) {
      const variants = doc[p].variants || [];

      for (let v = 0; v < variants.length; v += 1) {
        const sellingPrice = variants[v].selling_price;
        const cds = variants[v].comboDiscounts || [];

        variants[v].comboDiscounts = cds.map((cd) => ({
          ...cd,
          discount_price: calculateComboDiscountPricePerSet({
            sellingPrice,
            comboQuantity: cd.combo_quantity,
            discountType: cd.discount_type,
            discountValue: cd.discount_value,
          }),
        }));
      }
    }

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

  const productWhere = generateWhereCondition(productFilters, ProductModel);

  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    CategoryModel,
    {
      subQuery: false,
      where: { status: 'ACTIVE' },
      attributes: [ 'id', 'title', 'image', 'status' ],
      include: [
        {
          model: ProductModel,
          as: 'products',
          where: { ...productWhere, status: 'ACTIVE' },
          required: false,
          attributes: [
            'id',
            'title',
            'status',
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
        'status',
        'concurrency_stamp',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: CategoryModel,
          as: 'category',
          attributes: [ 'id', 'title' ],
        },
        {
          model: SubCategoryModel,
          as: 'subCategory',
          attributes: [ 'id', 'title' ],
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
            'description',
            'nutritional',
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
          include: [
            {
              model: VariantComboDiscountModel,
              as: 'comboDiscounts',
              where: { status: 'ACTIVE' },
              required: false,
              attributes: [
                'id',
                'combo_quantity',
                'discount_type',
                'discount_value',
                'start_date',
                'end_date',
                'status',
                'concurrency_stamp',
              ],
            },
          ],
          order: [ [ 'variant_name', 'ASC' ] ],
        },
        {
          model: ProductImageModel,
          as: 'images',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: [ 'id', 'image_url', 'is_default', 'display_order', 'variant_id', 'status' ],
          order: [ [ 'display_order', 'ASC' ], [ 'is_default', 'DESC' ] ],
        },
        {
          model: ProductTypeModel,
          as: 'productType',
          attributes: [ 'id', 'title' ],
          required: false,
        },
      ],
    });

    if (!product) {
      return handleServiceError(new NotFoundError('Product not found'));
    }

    const convertedProduct = convertImageFieldsToCloudFront(
      JSON.parse(JSON.stringify(product.dataValues)),
      [ 'image', 'logo', 'image_url' ],
    );

    // Add discount_price to comboDiscounts (price for ONE combo set)
    const variants = convertedProduct.variants || [];

    for (let v = 0; v < variants.length; v += 1) {
      const sellingPrice = variants[v].selling_price;
      const cds = variants[v].comboDiscounts || [];

      variants[v].comboDiscounts = cds.map((cd) => ({
        ...cd,
        discount_price: calculateComboDiscountPricePerSet({
          sellingPrice,
          comboQuantity: cd.combo_quantity,
          discountType: cd.discount_type,
          discountValue: cd.discount_value,
        }),
      }));
    }

    return {
      doc: {
        ...convertedProduct,
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch product details');
  }
};

const getProductStats = async (productId) => {
  try {
    // Verify product exists
    const product = await ProductModel.findOne({
      where: { id: productId },
      attributes: [ 'id', 'title' ],
    });

    if (!product) {
      return handleServiceError(new NotFoundError('Product not found'));
    }

    // Get all active variants for the product to calculate current stock
    const variants = await ProductVariantModel.findAll({
      where: {
        product_id: productId,
        status: 'ACTIVE',
      },
      attributes: [ 'id', 'quantity' ],
    });

    // Calculate current stock (sum of all variant quantities, or product quantity if no variants)
    const currentStock = variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);

    // Get order items for this product with order information
    // Filter by delivered orders only (completed orders)
    const orderItems = await OrderItemModel.findAll({
      where: {
        product_id: productId,
      },
      attributes: [
        'id',
        'order_id',
        'quantity',
        'price_at_purchase',
      ],
      include: [
        {
          model: OrderModel,
          as: 'order',
          attributes: [ 'id', 'status' ],
          where: {
            status: ORDER_STATUS.DELIVERED,
          },
          required: true,
        },
      ],
    });

    // Calculate statistics
    const totalOrders = new Set(orderItems.map((item) => item.order_id)).size;
    const unitsSold = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const revenueGenerated = orderItems.reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item.price_at_purchase || 0)),
      0,
    );

    return {
      doc: {
        product_id: productId,
        product_title: product.title,
        total_orders: totalOrders,
        units_sold: unitsSold,
        revenue_generated: revenueGenerated,
        current_stock: currentStock,
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch product statistics');
  }
};

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  searchProducts,
  getProductsGroupedByCategory,
  getProductDetails,
  deleteProduct,
  getProductStats,
};
