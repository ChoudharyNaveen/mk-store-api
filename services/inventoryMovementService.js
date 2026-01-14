/* eslint-disable max-lines */
const {
  inventoryMovement: InventoryMovementModel,
  product: ProductModel,
  productVariant: ProductVariantModel,
  user: UserModel,
  sequelize,
  Sequelize: { Op },
} = require('../database');
const {
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
  convertSnakeToCamel,
} = require('../utils/helper');
const {
  NotFoundError,
  ValidationError,
  handleServiceError,
} = require('../utils/serviceErrors');
const { getProductStatusFromQuantity } = require('../utils/constants/productStatusConstants');
const {
  INVENTORY_MOVEMENT_TYPE,
  isValidMovementType,
  requiresPositiveQuantity,
  requiresNegativeQuantity,
} = require('../utils/constants/inventoryMovementTypeConstants');

/**
 * Create inventory movement record (called internally)
 * @param {Object} data - Movement data
 * @param {Object} transaction - Sequelize transaction (optional)
 * @returns {Promise<void>}
 */
const createInventoryMovement = async (data, transaction = null) => {
  try {
    const {
      productId,
      variantId = null,
      vendorId,
      branchId,
      movementType,
      quantityChange,
      quantityBefore,
      quantityAfter,
      referenceType = null,
      referenceId = null,
      userId = null,
      notes = null,
    } = data;

    // Validate movement type
    if (!isValidMovementType(movementType)) {
      throw new ValidationError(`Invalid movement type: ${movementType}`);
    }

    // Validate quantity change matches movement type
    if (requiresPositiveQuantity(movementType)) {
      if (quantityChange <= 0) {
        throw new ValidationError(`Quantity change must be positive for ${movementType} movements`);
      }
    } else if (requiresNegativeQuantity(movementType)) {
      if (quantityChange >= 0) {
        throw new ValidationError('Quantity change must be negative for REMOVED movements');
      }
    }

    await InventoryMovementModel.create({
      product_id: productId,
      variant_id: variantId,
      vendor_id: vendorId,
      branch_id: branchId,
      movement_type: movementType,
      quantity_change: quantityChange,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reference_type: referenceType,
      reference_id: referenceId,
      user_id: userId,
      notes,
      created_at: new Date(),
    }, {
      transaction,
    });
  } catch (error) {
    console.error('Error creating inventory movement:', error);

    // Don't throw error - inventory movement tracking is not critical for operations
    // But log it for debugging
  }
};

/**
 * Get inventory movements with pagination and filtering
 * @param {Object} payload - Query parameters
 * @returns {Promise<{count: number, totalCount: number, doc: Array}>}
 */
const getInventoryMovements = async (payload) => {
  try {
    const {
      pageSize,
      pageNumber,
      filters,
      sorting,
      productId,
      variantId,
      vendorId,
      branchId,
      movementType,
      dateFrom,
      dateTo,
    } = payload;

    const { limit, offset } = calculatePagination(pageSize, pageNumber);

    const where = generateWhereCondition(filters);

    // Add filters
    if (productId) {
      where.product_id = productId;
    }

    if (variantId) {
      where.variant_id = variantId;
    }

    if (vendorId) {
      where.vendor_id = vendorId;
    }

    if (branchId) {
      where.branch_id = branchId;
    }

    if (movementType) {
      where.movement_type = movementType;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.created_at = {};

      if (dateFrom) {
        where.created_at[Op.gte] = new Date(dateFrom);
      }

      if (dateTo) {
        where.created_at[Op.lte] = new Date(dateTo);
      }
    }

    const order = sorting
      ? generateOrderCondition(sorting)
      : [ [ 'created_at', 'DESC' ] ];

    const response = await findAndCountAllWithTotal(
      InventoryMovementModel,
      {
        where,
        attributes: [
          'id',
          'product_id',
          'variant_id',
          'vendor_id',
          'branch_id',
          'movement_type',
          'quantity_change',
          'quantity_before',
          'quantity_after',
          'reference_type',
          'reference_id',
          'user_id',
          'notes',
          'created_at',
        ],
        include: [
          {
            model: ProductModel,
            as: 'product',
            attributes: [ 'id', 'title' ],
            required: false,
          },
          {
            model: ProductVariantModel,
            as: 'variant',
            attributes: [ 'id', 'variant_name' ],
            required: false,
          },
          {
            model: UserModel,
            as: 'user',
            attributes: [ 'id', 'name', 'email' ],
            required: false,
          },
          // Note: vendor and branch are stored as IDs, not foreign keys
          // We'll include vendor_id and branch_id in the response for manual joining if needed
        ],
        order,
        limit,
        offset,
      },
    );

    let doc = [];

    if (response) {
      const { count, totalCount, rows } = response;

      doc = rows.map((row) => {
        const data = convertSnakeToCamel(row.dataValues);

        return data;
      });

      return { count, totalCount, doc };
    }

    return { count: 0, totalCount: 0, doc: [] };
  } catch (error) {
    return handleServiceError(error, 'Failed to get inventory movements');
  }
};

/**
 * Manual inventory adjustment (VENDOR_ADMIN only)
 * @param {Object} data - Adjustment data
 * @returns {Promise<{doc: object}>}
 */
const adjustInventory = async ({ data }) => {
  let transaction = null;

  try {
    const {
      productId,
      variantId = null,
      quantityChange,
      notes,
      userId,
      vendorId,
      branchId,
    } = data;

    if (!quantityChange || quantityChange === 0) {
      throw new ValidationError('Quantity change is required and cannot be zero');
    }

    transaction = await sequelize.transaction();

    // Get current product or variant
    let currentQuantity;
    let product;
    let variant = null;

    if (variantId) {
      variant = await ProductVariantModel.findOne({
        where: { id: variantId, product_id: productId },
        attributes: [ 'id', 'quantity', 'vendor_id', 'branch_id' ],
        transaction,
      });

      if (!variant) {
        throw new NotFoundError('Product variant not found');
      }

      // Verify vendor and branch match (if provided)
      if (vendorId && variant.vendor_id !== vendorId) {
        throw new ValidationError('Vendor does not match');
      }

      if (branchId && variant.branch_id !== branchId) {
        throw new ValidationError('Branch does not match');
      }

      currentQuantity = variant.quantity;
    } else {
      product = await ProductModel.findOne({
        where: { id: productId },
        attributes: [ 'id', 'quantity', 'vendor_id', 'branch_id' ],
        transaction,
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Verify vendor and branch match (if provided)
      if (vendorId && product.vendor_id !== vendorId) {
        throw new ValidationError('Vendor does not match');
      }

      if (branchId && product.branch_id !== branchId) {
        throw new ValidationError('Branch does not match');
      }

      currentQuantity = product.quantity;
    }

    const finalVendorId = vendorId || (variant ? variant.vendor_id : product.vendor_id);
    const finalBranchId = branchId || (variant ? variant.branch_id : product.branch_id);

    const quantityBefore = currentQuantity;
    const quantityAfter = Math.max(0, currentQuantity + quantityChange); // Prevent negative quantities
    const movementType = quantityChange > 0 ? INVENTORY_MOVEMENT_TYPE.ADDED : INVENTORY_MOVEMENT_TYPE.ADJUSTED;

    // Update quantity
    if (variant) {
      await ProductVariantModel.update(
        {
          quantity: quantityAfter,
          product_status: getProductStatusFromQuantity(quantityAfter),
        },
        {
          where: { id: variantId },
          transaction,
        },
      );
    } else {
      await ProductModel.update(
        {
          quantity: quantityAfter,
          product_status: getProductStatusFromQuantity(quantityAfter),
        },
        {
          where: { id: productId },
          transaction,
        },
      );
    }

    // Create movement record
    await createInventoryMovement({
      productId,
      variantId,
      vendorId: finalVendorId,
      branchId: finalBranchId,
      movementType,
      quantityChange,
      quantityBefore,
      quantityAfter,
      referenceType: 'MANUAL',
      referenceId: productId,
      userId,
      notes,
    }, transaction);

    await transaction.commit();

    return {
      doc: {
        product_id: productId,
        variant_id: variantId,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        quantity_change: quantityChange,
        message: 'Inventory adjusted successfully',
      },
    };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to adjust inventory');
  }
};

module.exports = {
  createInventoryMovement,
  getInventoryMovements,
  adjustInventory,
};
