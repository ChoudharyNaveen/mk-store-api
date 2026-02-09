/* eslint-disable max-lines */
const { v4: uuidV4 } = require('uuid');
const {
  productVariant: ProductVariantModel,
  product: ProductModel,
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
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');
const InventoryMovementService = require('./inventoryMovementService');
const { getProductStatusFromQuantity } = require('../utils/constants/productStatusConstants');
const { INVENTORY_MOVEMENT_TYPE } = require('../utils/constants/inventoryMovementTypeConstants');
const {
  NotFoundError,
  ValidationError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

const saveProductVariant = async ({ data }) => {
  let transaction = null;

  try {
    const {
      createdBy, productId, variantName, ...datas
    } = data;

    transaction = await sequelize.transaction();

    // Verify product exists and get vendor_id and branch_id
    const product = await ProductModel.findOne({
      where: { id: productId },
      attributes: [ 'id', 'vendor_id', 'branch_id', 'title' ],
      transaction,
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check if variant with same name already exists for this product
    const existingVariant = await ProductVariantModel.findOne({
      where: {
        product_id: productId,
        variant_name: variantName,
        status: 'ACTIVE',
      },
      transaction,
    });

    if (existingVariant) {
      throw new ValidationError('Variant with this name already exists for this product');
    }

    const concurrencyStamp = uuidV4();

    const initialQuantity = datas.quantity || 0;
    const thresholdStock = datas.thresholdStock || 0;

    const doc = {
      ...datas,
      productId,
      variantName,
      concurrencyStamp,
      createdBy,
      quantity: initialQuantity,
      productStatus: getProductStatusFromQuantity(initialQuantity, thresholdStock),
    };

    const variant = await ProductVariantModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    // Create inventory movement for initial quantity (ADDED)
    if (variant.quantity > 0) {
      await InventoryMovementService.createInventoryMovement({
        productId,
        variantId: variant.id,
        vendorId: product.vendor_id,
        branchId: product.branch_id,
        movementType: INVENTORY_MOVEMENT_TYPE.ADDED,
        quantityChange: variant.quantity,
        quantityBefore: 0,
        quantityAfter: variant.quantity,
        referenceType: 'PRODUCT',
        referenceId: productId,
        userId: createdBy,
        notes: 'Initial variant creation',
      });
    }

    await transaction.commit();

    const variantData = convertSnakeToCamel(variant.dataValues);

    return { doc: variantData };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to save product variant');
  }
};

const updateProductVariant = async ({ data }) => {
  let transaction = null;

  try {
    const { id, ...datas } = data;
    const {
      concurrencyStamp, updatedBy, variantName,
    } = datas;

    transaction = await sequelize.transaction();

    const response = await ProductVariantModel.findOne({
      where: { id },
      attributes: [ 'id', 'product_id', 'concurrency_stamp', 'quantity', 'variant_name', 'items_per_unit', 'units' ],
      include: [
        {
          model: ProductModel,
          as: 'product',
          attributes: [ 'id', 'vendor_id', 'branch_id' ],
        },
      ],
      transaction,
    });

    if (!response) {
      throw new NotFoundError('Product variant not found');
    }

    const {
      concurrency_stamp: stamp,
      product_id: productId,
      quantity: oldQuantity,
      threshold_stock: oldThresholdStock,
      items_per_unit: itemsPerUnit,
      units,
    } = response;

    if (concurrencyStamp !== stamp) {
      throw new ConcurrencyError('invalid concurrency stamp');
    }

    // Check if variant name is being changed and if it conflicts
    if (variantName && variantName !== response.variant_name) {
      const existingVariant = await ProductVariantModel.findOne({
        where: {
          productId,
          variant_name: variantName,
          id: { [Op.ne]: id },
          status: 'ACTIVE',
        },
        transaction,
      });

      if (existingVariant) {
        throw new ValidationError('Variant with this name already exists for this product');
      }
    }

    // Update product_status based on quantity and threshold_stock
    const newQuantity = datas.quantity !== undefined ? datas.quantity : oldQuantity;
    const newThresholdStock = datas.thresholdStock !== undefined ? datas.thresholdStock : oldThresholdStock;

    if (datas.quantity !== undefined || datas.thresholdStock !== undefined) {
      datas.productStatus = getProductStatusFromQuantity(newQuantity, newThresholdStock);
    }

    // Calculate and update units if quantity changed and items_per_unit is present
    if (datas.quantity !== undefined && itemsPerUnit && itemsPerUnit > 0) {
      const quantityChange = datas.quantity - oldQuantity;
      const unitsChange = quantityChange / itemsPerUnit;
      const currentUnits = parseFloat(units) || 0;
      const newUnits = Math.max(0, currentUnits + unitsChange);

      datas.units = newUnits.toString();
    }

    const newConcurrencyStamp = uuidV4();

    const updateData = {
      ...datas,
      updatedBy,
      concurrencyStamp: newConcurrencyStamp,
    };

    await ProductVariantModel.update(convertCamelToSnake(updateData), {
      where: { id },
      transaction,
    });

    const updated = await ProductVariantModel.findOne({
      where: { id },
      include: [
        {
          model: ProductModel,
          as: 'product',
          attributes: [ 'id', 'vendor_id', 'branch_id' ],
        },
      ],
      transaction,
    });

    // Track inventory movement if quantity changed

    if (datas.quantity !== undefined && datas.quantity !== oldQuantity) {
      const quantityChange = datas.quantity - oldQuantity;
      const quantityAfter = datas.quantity;

      // Create inventory movement (ADJUSTED)
      await InventoryMovementService.createInventoryMovement({
        productId,
        variantId: id,
        vendorId: updated?.product?.vendor_id || null,
        branchId: updated?.product?.branch_id || null,
        movementType: INVENTORY_MOVEMENT_TYPE.ADJUSTED,
        quantityChange,
        quantityBefore: oldQuantity,
        quantityAfter,
        referenceType: 'PRODUCT',
        referenceId: productId,
        userId: updatedBy,
        notes: 'Variant quantity updated',
      });
    }

    await transaction.commit();

    const variantData = convertSnakeToCamel(updated.dataValues);

    return { doc: variantData };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to update product variant');
  }
};

const getProductVariants = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting, productId,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);

  // Add productId filter if provided
  if (productId) {
    where.product_id = productId;
  }

  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'created_at', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    ProductVariantModel,
    {
      where: { ...where, status: 'ACTIVE' },
      attributes: [
        'id',
        'product_id',
        'variant_name',
        'description',
        'nutritional',
        'price',
        'selling_price',
        'quantity',
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
          model: ProductModel,
          as: 'product',
          attributes: [ 'id', 'title', 'vendor_id', 'branch_id' ],
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
};

const getVariantById = async (variantId) => {
  try {
    const variant = await ProductVariantModel.findOne({
      where: { id: variantId },
      attributes: [
        'id',
        'product_id',
        'variant_name',
        'description',
        'nutritional',
        'price',
        'selling_price',
        'quantity',
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
          model: ProductModel,
          as: 'product',
          attributes: [ 'id', 'title', 'vendor_id', 'branch_id' ],
        },
      ],
    });

    if (!variant) {
      return handleServiceError(new NotFoundError('Product variant not found'));
    }

    const variantData = convertSnakeToCamel(variant.dataValues);

    return { doc: variantData };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch product variant');
  }
};

const deleteProductVariant = async (variantId) => {
  let transaction = null;

  try {
    transaction = await sequelize.transaction();

    const variant = await ProductVariantModel.findOne({
      where: { id: variantId },
      attributes: [ 'id', 'concurrency_stamp' ],
      transaction,
    });

    if (!variant) {
      throw new NotFoundError('Product variant not found');
    }

    // Soft delete by setting status to INACTIVE
    await ProductVariantModel.update(
      {
        status: 'INACTIVE',
        concurrency_stamp: uuidV4(),
      },
      {
        where: { id: variantId },
        transaction,
      },
    );

    await transaction.commit();

    return { doc: { message: 'Product variant deleted successfully' } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to delete product variant');
  }
};

const getVariantsByType = async (productId) => {
  try {
    const variants = await ProductVariantModel.findAll({
      where: {
        product_id: productId,
        status: 'ACTIVE',
      },
      attributes: [
        'id',
        'variant_name',
        'price',
        'selling_price',
        'quantity',
        'product_status',
      ],
      order: [ [ 'variant_name', 'ASC' ] ],
    });

    // Return all variants as a single group
    const variantData = variants.map((variant) => convertSnakeToCamel(variant.dataValues));

    return { doc: { all: variantData } };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch variants');
  }
};

module.exports = {
  saveProductVariant,
  updateProductVariant,
  getProductVariants,
  getVariantById,
  deleteProductVariant,
  getVariantsByType,
};
