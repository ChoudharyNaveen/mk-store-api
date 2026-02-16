/* eslint-disable max-lines */
const { v4: uuidV4 } = require('uuid');
const { fn, col } = require('sequelize');
const {
  order: OrderModel,
  cart: CartModel,
  product: ProductModel,
  productVariant: ProductVariantModel,
  orderItem: OrderItemModel,
  address: AddressModel,
  user: UserModel,
  offer: OfferModel,
  promocode: PromocodeModel,
  role: RoleModel,
  branch: BranchModel,
  orderDiscount: OrderDiscountModel,
  orderStatusHistory: OrderStatusHistoryModel,
  productImage: ProductImageModel,
  user_roles_mappings: UserRolesMappingModel,
  variantComboDiscount: VariantComboDiscountModel,
  sequelize,
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
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');
const {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  canTransitionToStatus,
  canTransitionByRole,
  isValidOrderStatus,
} = require('../utils/constants/orderStatusConstants');
const { ROLE } = require('../utils/constants/roleConstants');
const { getProductStatusFromQuantity } = require('../utils/constants/productStatusConstants');
const { INVENTORY_MOVEMENT_TYPE } = require('../utils/constants/inventoryMovementTypeConstants');
const { NOTIFICATION_TYPE } = require('../utils/constants/notificationConstants');
const { REFUND_STATUS } = require('../utils/constants/refundStatusConstants');
const { PAYMENT_STATUS } = require('../utils/constants/paymentStatusConstants');
const {
  createOrderPlacedNotification, createOrderUpdatedNotification, createOrderReadyForPickupNotification, createOrderAcceptedNotification, createOrderArrivedNotification,
} = require('./notificationService');
const { sendFCMNotificationToRiders, sendFCMNotificationToUser } = require('./fcmService');
const ShippingService = require('./shippingService');
const InventoryMovementService = require('./inventoryMovementService');
const RiderStatsService = require('./riderStatsService');
const {
  ValidationError,
  NotFoundError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

// ============================================================================
// Helper Methods for Order Operations
// ============================================================================

// Generate unique order number
// Optimized: Uses index on (order_number, created_at) for faster LIKE queries
const generateOrderNumber = async (transaction) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
  const prefix = `ORD-${dateStr}-`;

  // Create date range for today (start and end of day)
  const todayStart = new Date(today);

  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);

  todayEnd.setHours(23, 59, 59, 999);

  // Optimized: Use date filter to leverage composite index (order_number, created_at)
  // The index idx_orders_number_created will speed up this query significantly
  const lastOrder = await OrderModel.findOne({
    where: {
      order_number: {
        [Op.like]: `${prefix}%`,
      },
      // Add date filter to use composite index more efficiently
      created_at: {
        [Op.gte]: todayStart,
        [Op.lt]: todayEnd,
      },
    },
    attributes: [ 'order_number' ],
    order: [ [ 'order_number', 'DESC' ] ],
    limit: 1,
    transaction,
  });

  let sequence = 1;

  if (lastOrder && lastOrder.order_number) {
    // Extract sequence number from last order (e.g., ORD-20250101-000123 -> 123)
    const lastSequence = parseInt(lastOrder.order_number.split('-')[2] || '0');

    sequence = lastSequence + 1;
  }

  // Format: ORD-YYYYMMDD-000001 (6 digits for sequence)
  const orderNumber = `${prefix}${sequence.toString().padStart(6, '0')}`;

  return orderNumber;
};

// ============================================================================
// Helper Methods for Place Order
// ============================================================================

// Helper: Validate place order input
const validatePlaceOrderInput = (data) => {
  const {
    branchId, vendorId, offerCode, promocodeId,
  } = data;

  if (!branchId) {
    throw new ValidationError('branchId is required');
  }

  if (!vendorId) {
    throw new ValidationError('vendorId is required');
  }

  if (offerCode && promocodeId) {
    throw new ValidationError('Cannot apply both offer code and promo code. Please choose one.');
  }
};

// Helper: Validate and fetch branch
const validateAndFetchBranch = async (branchId, vendorId, transaction) => {
  const branch = await BranchModel.findOne({
    where: { id: branchId, vendor_id: vendorId },
    attributes: [ 'id', 'vendor_id' ],
    transaction,
  });

  if (!branch) {
    throw new ValidationError('Branch not found or does not belong to the specified vendor');
  }

  return branch;
};

// Helper: Fetch and validate cart items
const fetchAndValidateCartItems = async (createdBy, vendorId, branchId, transaction) => {
  const cartItems = await CartModel.findAll({
    where: {
      created_by: createdBy,
      status: 'ACTIVE',
      vendor_id: vendorId,
      branch_id: branchId,
    },
    attributes: [ 'id', 'product_id', 'variant_id', 'vendor_id', 'branch_id', 'quantity', 'unit_price', 'total_price', 'combo_id', 'created_by' ],
    include: [
      {
        model: ProductVariantModel,
        as: 'variant',
        attributes: [ 'id', 'variant_name', 'product_id', 'selling_price', 'quantity', 'concurrency_stamp' ],
        required: true,
        include: [
          {
            model: ProductModel,
            as: 'product',
            attributes: [ 'id', 'title' ],
          },
        ],
      },
    ],
    transaction,
  });

  if (cartItems.length === 0) {
    throw new ValidationError('No items in the cart');
  }

  const invalidItems = cartItems.filter((item) => {
    if (!item.variant_id || !item.variant) {
      return true;
    }

    if (item.product_id !== item.variant.product_id) {
      return true;
    }

    return false;
  });

  if (invalidItems.length > 0) {
    const missingVariant = invalidItems.find((item) => !item.variant_id || !item.variant);
    const productMismatch = invalidItems.find((item) => item.product_id !== item.variant?.product_id);

    if (missingVariant) {
      throw new ValidationError('All cart items must have a variant. Products without variants are not supported.');
    }

    if (productMismatch) {
      throw new ValidationError('Product ID in cart does not match the variant\'s product. Please refresh your cart.');
    }
  }

  return cartItems;
};

// Helper: Calculate order amount and validate quantities
const calculateOrderAmount = async (cartItems, transaction) => {
  let totalAmount = 0;
  const validationResults = await Promise.all(cartItems.map(async (item) => {
    const {
      quantity: cartQuantity,
      variant,
      total_price: totalPrice,
      unit_price: unitPrice,
      combo_id: comboId,
    } = item;

    if (!variant) {
      return {
        errors: { message: `Product variant with id ${item.variant_id} not found` },
      };
    }

    const itemTitle = variant.variant_name;
    const currentQuantity = variant.quantity;
    const itemConcurrencyStamp = variant.concurrency_stamp;
    const itemProductId = variant.product_id;
    const itemVariantId = variant.id;
    const itemVariantName = variant.variant_name;

    let orderQuantity;
    let priceAtPurchase;
    let subtotal;
    let finalComboId = null;

    if (comboId) {
      // Fetch combo discount to get combo_quantity
      const comboDiscount = await VariantComboDiscountModel.findOne({
        where: { id: comboId },
        attributes: [ 'id', 'combo_quantity' ],
        transaction,
      });

      if (!comboDiscount) {
        return {
          errors: { message: `Combo discount with id ${comboId} not found` },
        };
      }

      // Order quantity = cart quantity × combo_quantity
      orderQuantity = cartQuantity * comboDiscount.combo_quantity;
      // Price at purchase = cart unit_price (combo price per set)
      priceAtPurchase = unitPrice;
      // Subtotal = cart quantity × cart unit_price (combo price per set)
      subtotal = cartQuantity * unitPrice;
      finalComboId = comboId;
    } else {
      // Regular item: use cart quantity as-is
      orderQuantity = cartQuantity;
      priceAtPurchase = unitPrice || variant.selling_price;
      subtotal = totalPrice || (priceAtPurchase * cartQuantity);
      finalComboId = null;
    }

    // Validate inventory: check orderQuantity (not cartQuantity)
    if (orderQuantity > currentQuantity) {
      return {
        errors: {
          message: `we apologize for the inconvenience, quantity for the ${itemTitle} is left with only ${currentQuantity}.
          please try with lower quantity`,
        },
      };
    }

    return {
      orderItem: {
        product_id: itemProductId,
        variant_id: itemVariantId,
        variant_name: itemVariantName,
        quantity: orderQuantity,
        price_at_purchase: priceAtPurchase,
        combo_id: finalComboId,
        subtotal,
        product_quantity: currentQuantity,
        product_concurrency_stamp: itemConcurrencyStamp,
      },
      subtotal,
    };
  }));

  const errorResult = validationResults.find((result) => result?.errors);

  if (errorResult) {
    throw new ValidationError(errorResult?.errors?.message);
  }

  const orderItemsData = validationResults.map((result) => result?.orderItem);

  totalAmount += validationResults.reduce((sum, result) => sum + (result?.subtotal || 0), 0);

  return { totalAmount, orderItemsData };
};

// Helper: Handle address creation or validation
const handleOrderAddress = async (data, createdBy, transaction) => {
  const {
    addressId, addressLine1, addressLine2, street, landmark, city, state, country, pincode, name, mobileNumber, phone, email,
  } = data;

  if (addressId) {
    const address = await AddressModel.findOne({
      where: { id: addressId, created_by: createdBy },
      attributes: [ 'id', 'created_by', 'latitude', 'longitude' ],
      transaction,
    });

    if (!address) {
      throw new ValidationError('Address not found or does not belong to you.');
    }

    return address;
  }

  if (name && mobileNumber) {
    const addressConcurrencyStamp = uuidV4();

    const doc = {
      concurrencyStamp: addressConcurrencyStamp,
      address_line_1: addressLine1 || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      address_line_2: addressLine2 || null,
      street: street || null,
      landmark: landmark || null,
      city: city || null,
      state: state || null,
      country: country || 'India',
      pincode: pincode || null,
      name,
      mobileNumber,
      phone: phone || null,
      email: email || null,
      createdBy,
    };

    const address = await AddressModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    return address;
  }

  throw new ValidationError('Address not found. Please provide address details(name, mobileNumber) or addressId.');
};

// Helper: Apply offer discount
const applyOfferDiscount = async (offerCode, totalAmount, transaction) => {
  const offer = await OfferModel.findOne({
    where: {
      code: offerCode,
      status: 'ACTIVE',
    },
    attributes: [ 'id', 'code', 'percentage', 'min_order_price', 'start_date', 'end_date' ],
    transaction,
  });

  const currentDate = new Date();

  if (!offer) {
    throw new ValidationError('Invalid offer code.');
  }

  if (currentDate < new Date(offer.start_date) || currentDate > new Date(offer.end_date)) {
    throw new ValidationError('This offer is not valid at the moment.');
  }

  if (totalAmount < offer.min_order_price) {
    throw new ValidationError(`Order amount must be atleast ₹${offer.min_order_price} to use this offer`);
  }

  const discountPercentage = offer.percentage;
  const discountAmount = totalAmount * (offer.percentage / 100);

  return {
    discountApplied: true,
    discountType: 'OFFER',
    discountId: offer.id,
    discountPercentage,
    discountAmount,
  };
};

// Helper: Apply promo code discount
const applyPromocodeDiscount = async (promocodeId, branchId, totalAmount, transaction) => {
  const promocode = await PromocodeModel.findOne({
    where: {
      id: promocodeId,
      status: 'ACTIVE',
    },
    attributes: [ 'id', 'code', 'percentage', 'start_date', 'end_date', 'branch_id', 'vendor_id' ],
    transaction,
  });

  const currentDate = new Date();

  if (!promocode) {
    throw new ValidationError('Invalid promo code.');
  }

  if (currentDate < new Date(promocode.start_date) || currentDate > new Date(promocode.end_date)) {
    throw new ValidationError('This promo code is not valid at the moment.');
  }

  if (promocode.branch_id && promocode.branch_id !== branchId) {
    throw new ValidationError('This promo code is not valid for this branch.');
  }

  const discountPercentage = promocode.percentage;
  const discountAmount = totalAmount * (promocode.percentage / 100);

  return {
    discountApplied: true,
    discountType: 'PROMOCODE',
    discountId: promocode.id,
    discountPercentage,
    discountAmount,
  };
};

// Helper: Calculate shipping charges
// If shippingCharges is provided in request, use it; otherwise calculate using shipping service
const calculateOrderShipping = async (branchId, addressId, orderPriority, providedShippingCharges, totalAmount, transaction) => {
  // If shipping charges are explicitly provided, use them
  if (providedShippingCharges !== undefined && providedShippingCharges !== null) {
    return {
      shippingCharges: providedShippingCharges,
      distance: null,
      distanceMethod: 'MANUAL',
      estimatedDeliveryETA: null,
    };
  }

  // Otherwise, calculate using shipping service
  const deliveryType = (orderPriority === 'EXPRESS' || orderPriority === 'URGENT') ? 'SAME_DAY' : 'NEXT_DAY';

  const [ addressWithCoords, branchWithCoords ] = await Promise.all([
    AddressModel.findOne({
      where: { id: addressId },
      attributes: [ 'id', 'latitude', 'longitude' ],
      transaction,
    }),
    BranchModel.findOne({
      where: { id: branchId },
      attributes: [ 'id', 'latitude', 'longitude' ],
      transaction,
    }),
  ]);

  if (addressWithCoords?.latitude && addressWithCoords?.longitude && branchWithCoords?.latitude && branchWithCoords?.longitude) {
    try {
      const shippingResult = await ShippingService.calculateShippingCharges(
        branchId,
        addressWithCoords.latitude,
        addressWithCoords.longitude,
        totalAmount,
        deliveryType,
      );

      if (shippingResult.doc && !shippingResult.errors) {
        return {
          shippingCharges: shippingResult.doc.shippingCharges || 0,
          distance: shippingResult.doc.distance || null,
          distanceMethod: shippingResult.doc.method || 'MANUAL',
          estimatedDeliveryETA: shippingResult.doc.eta || null,
        };
      }
    } catch (error) {
      console.error('Error calculating shipping charges:', error);
    }
  }

  // Fallback to 0 if calculation fails
  return {
    shippingCharges: 0,
    distance: null,
    distanceMethod: 'MANUAL',
    estimatedDeliveryETA: null,
  };
};

// Helper: Create order items and reduce inventory
// Optimized: Uses bulk operations for better performance
const createOrderItemsAndReduceInventory = async (orderItemsData, orderId, orderNumber, vendorId, branchId, createdBy, discountAmount, totalAmount, transaction) => {
  // Calculate discount per item proportionally
  // discountAmount is the total discount applied at order level (from offer/promocode)
  // Combo discounts are already included in subtotal from cart
  const discountRatio = totalAmount > 0 ? (discountAmount / totalAmount) : 0;

  // Prepare bulk data for order items
  const orderItemsBulk = orderItemsData.map((item) => {
    const itemSubtotal = item.subtotal || (item.price_at_purchase * item.quantity);
    const itemDiscount = itemSubtotal * discountRatio;

    return {
      concurrency_stamp: uuidV4(),
      order_id: orderId,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      variant_name: item.variant_name || null,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
      combo_id: item.combo_id || null,
      subtotal: item.subtotal || itemSubtotal,
      discount_amount: itemDiscount,
      created_by: createdBy,
    };
  });

  // Bulk insert order items (much faster than individual inserts)
  await OrderItemModel.bulkCreate(orderItemsBulk, {
    transaction,
  });

  // Prepare variant updates data
  const variantUpdates = orderItemsData
    .filter((item) => item.variant_id)
    .map((item) => ({
      id: item.variant_id,
      quantityRemaining: item.product_quantity - item.quantity,
      quantityBefore: item.product_quantity,
      quantityChange: -item.quantity,
      productId: item.product_id,
    }));

  // Fetch variants with items_per_unit and units for units calculation
  const variantIds = variantUpdates.map((update) => update.id);
  const variants = await ProductVariantModel.findAll({
    where: {
      id: {
        [Op.in]: variantIds,
      },
    },
    attributes: [ 'id', 'items_per_unit', 'units', 'threshold_stock' ],
    transaction,
  });

  // Create a map for quick variant lookup
  const variantMap = new Map(variants.map((v) => [ v.id, v ]));

  // Batch update variants in parallel (optimized from sequential updates)
  await Promise.all(variantUpdates.map(async (update) => {
    const variant = variantMap.get(update.id);
    const thresholdStock = variant?.threshold_stock || 0;
    const updateData = {
      quantity: update.quantityRemaining,
      product_status: getProductStatusFromQuantity(update.quantityRemaining, thresholdStock),
      concurrency_stamp: uuidV4(),
    };

    // Calculate and update units if items_per_unit is present
    if (variant && variant.items_per_unit && variant.items_per_unit > 0) {
      const quantityChange = Math.abs(update.quantityChange); // Make positive for calculation
      const unitsToReduce = quantityChange / variant.items_per_unit;
      const currentUnits = parseFloat(variant.units) || 0;
      const newUnits = Math.max(0, currentUnits - unitsToReduce);

      updateData.units = newUnits.toString();
    }

    await ProductVariantModel.update(
      updateData,
      {
        where: { id: update.id },
        transaction,
      },
    );
  }));

  // Prepare inventory movements for bulk creation
  const inventoryMovementsData = variantUpdates.map((update) => ({
    product_id: update.productId,
    variant_id: update.id,
    vendor_id: vendorId,
    branch_id: branchId,
    movement_type: INVENTORY_MOVEMENT_TYPE.REMOVED,
    quantity_change: update.quantityChange,
    quantity_before: update.quantityBefore,
    quantity_after: update.quantityRemaining,
    reference_type: 'ORDER',
    reference_id: orderId,
    user_id: createdBy,
    notes: `Order ${orderNumber}`,
    created_at: new Date(),
  }));

  // Create inventory movements in parallel (optimized from sequential)
  await Promise.all(inventoryMovementsData.map(async (movement) => {
    await InventoryMovementService.createInventoryMovement({
      productId: movement.product_id,
      variantId: movement.variant_id,
      vendorId: movement.vendor_id,
      branchId: movement.branch_id,
      movementType: movement.movement_type,
      quantityChange: movement.quantity_change,
      quantityBefore: movement.quantity_before,
      quantityAfter: movement.quantity_after,
      referenceType: movement.reference_type,
      referenceId: movement.reference_id,
      userId: movement.user_id,
      notes: movement.notes,
    }, transaction);
  }));
};

// Helper: Clear user's cart
const clearUserCart = async (createdBy, transaction) => {
  await CartModel.destroy({
    where: {
      created_by: createdBy,
      status: 'ACTIVE',
    },
    transaction,
  });
};

const placeOrder = async (data) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy,
    vendorId,
    branchId,
    offerCode,
    promocodeId,
    orderPriority,
    estimatedDeliveryTime,
    shippingCharges,
  } = data;

  // Validate input
  validatePlaceOrderInput(data);

  // Validate and fetch branch
  await validateAndFetchBranch(branchId, vendorId, transaction);
  const branchVendorId = vendorId;

  // Fetch and validate cart items
  const cartItems = await fetchAndValidateCartItems(createdBy, branchVendorId, branchId, transaction);

  // Calculate order amount and validate quantities
  const { totalAmount, orderItemsData } = await calculateOrderAmount(cartItems, transaction);

  // Parallelize address handling and discount application (they don't depend on each other)
  const [ address, discountResult ] = await Promise.all([
    handleOrderAddress(data, createdBy, transaction),
    (async () => {
      let discountApplied = false;
      let discountType = null;
      let discountId = null;
      let discountPercentage = 0;
      let discountAmount = 0;

      if (offerCode) {
        const offerResult = await applyOfferDiscount(offerCode, totalAmount, transaction);

        discountApplied = offerResult.discountApplied;
        discountType = offerResult.discountType;
        discountId = offerResult.discountId;
        discountPercentage = offerResult.discountPercentage;
        discountAmount = offerResult.discountAmount;
      } else if (promocodeId) {
        const promocodeResult = await applyPromocodeDiscount(promocodeId, branchId, totalAmount, transaction);

        discountApplied = promocodeResult.discountApplied;
        discountType = promocodeResult.discountType;
        discountId = promocodeResult.discountId;
        discountPercentage = promocodeResult.discountPercentage;
        discountAmount = promocodeResult.discountAmount;
      }

      return {
        discountApplied,
        discountType,
        discountId,
        discountPercentage,
        discountAmount,
      };
    })(),
  ]);

  const originalAmount = totalAmount;
  const discountedTotal = totalAmount - discountResult.discountAmount;

  // Calculate shipping charges
  const shippingResult = await calculateOrderShipping(
    branchId,
    address.id,
    orderPriority,
    shippingCharges,
    discountedTotal,
    transaction,
  );

  // Calculate final amount: discountedTotal + shippingCharges
  const finalAmount = discountedTotal + shippingResult.shippingCharges;

  // Create order
  const orderConcurrencyStamp = uuidV4();
  const orderNumber = await generateOrderNumber(transaction);

  const orderDoc = {
    totalAmount,
    discountAmount: discountResult.discountAmount,
    shippingCharges: shippingResult.shippingCharges,
    finalAmount,
    addressId: address.id,
    branchId,
    orderNumber,
    orderPriority: orderPriority || 'NORMAL',
    estimatedDeliveryTime: estimatedDeliveryTime || null,
    distance: shippingResult.distance,
    distanceMethod: shippingResult.distanceMethod,
    estimatedDeliveryETA: shippingResult.estimatedDeliveryETA,
    refundAmount: 0,
    refundStatus: REFUND_STATUS.NONE,
    status: ORDER_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    concurrencyStamp: orderConcurrencyStamp,
    createdBy,
    vendorId,
  };

  const newOrder = await OrderModel.create(
    convertCamelToSnake(orderDoc),
    {
      transaction,
    },
  );

  // Create order discount record if discount was applied
  if (discountResult.discountApplied) {
    const discountDoc = {
      concurrencyStamp: uuidV4(),
      orderId: newOrder.id,
      discountType: discountResult.discountType,
      discountAmount: discountResult.discountAmount,
      discountPercentage: discountResult.discountPercentage,
      originalAmount,
      finalAmount,
      createdBy,
    };

    if (discountResult.discountType === 'OFFER') {
      discountDoc.offerId = discountResult.discountId;
    } else if (discountResult.discountType === 'PROMOCODE') {
      discountDoc.promocodeId = discountResult.discountId;
    }

    await OrderDiscountModel.create(convertCamelToSnake(discountDoc), {
      transaction,
    });
  }

  // Create initial status history
  const statusHistoryDoc = {
    orderId: newOrder.id,
    status: ORDER_STATUS.PENDING,
    previousStatus: null,
    changedBy: createdBy,
  };

  await OrderStatusHistoryModel.create(convertCamelToSnake(statusHistoryDoc), {
    transaction,
  });

  // Create order items and reduce inventory
  await createOrderItemsAndReduceInventory(
    orderItemsData,
    newOrder.id,
    orderNumber,
    branchVendorId,
    branchId,
    createdBy,
    discountResult.discountAmount,
    totalAmount,
    transaction,
  );

  // Clear user's cart
  await clearUserCart(createdBy, transaction);

  // Create notification for new order (after transaction commit)
  transaction.afterCommit(async () => {
    try {
      // Fetch branch details for notification
      const branchForNotification = await BranchModel.findOne({
        where: { id: branchId },
        attributes: [
          'id',
          'vendor_id',
          'name',
          'code',
          'address_line_1',
          'address_line_2',
          'street',
          'city',
          'state',
          'pincode',
          'phone',
          'email',
        ],
      });

      await createOrderPlacedNotification({
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        vendorId: branchVendorId,
        branchId,
        branch: branchForNotification,
        totalAmount: newOrder.final_amount,
        userId: createdBy,
        entityId: newOrder.id,
      });
    } catch (error) {
      console.error('Error creating order notification:', error);
    }
  });

  return {
    doc: {
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      total_amount: newOrder.total_amount,
      discount_amount: newOrder.discount_amount,
      shipping_charges: newOrder.shipping_charges,
      final_amount: newOrder.final_amount,
      order_priority: newOrder.order_priority,
      estimated_delivery_time: newOrder.estimated_delivery_time,
      distance: newOrder.distance,
      distance_method: newOrder.distance_method,
      estimated_delivery_eta: newOrder.estimated_delivery_eta,
      item_count: orderItemsData.length,
    },
  };
}).catch((error) => handleServiceError(error, 'Failed to place order'));

const getOrder = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters, OrderModel);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    OrderModel,
    {
      where: { ...where },
      attributes: [
        'id',
        'order_number',
        'total_amount',
        'discount_amount',
        'shipping_charges',
        'final_amount',
        'order_priority',
        'estimated_delivery_time',
        'distance',
        'distance_method',
        'estimated_delivery_eta',
        'refund_amount',
        'refund_status',
        'status',
        'payment_status',
        'rider_id',
        'branch_id',
        'address_id',
        'created_by',
        'created_at',
        'updated_at',
        'concurrency_stamp',
      ],
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'email', 'mobile_number' ],
        },
        {
          model: OrderItemModel,
          as: 'orderItems',
          attributes: [ 'id', 'product_id', 'variant_id', 'variant_name', 'quantity', 'price_at_purchase', 'combo_id', 'subtotal', 'discount_amount' ],
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
          ],
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    },
  );
  const doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const getOrderStats = async (payload) => {
  const { createdBy } = payload;

  try {
    const [ totals, byStatus ] = await Promise.all([
      OrderModel.findOne({
        where: { created_by: createdBy },
        attributes: [
          [ fn('COUNT', col('id')), 'total_orders' ],
          [ fn('COALESCE', fn('SUM', col('final_amount')), 0), 'total_amount' ],
          [ fn('MAX', col('created_at')), 'last_order_date' ],
        ],
        raw: true,
      }),
      OrderModel.findAll({
        where: { created_by: createdBy },
        attributes: [
          [ col('status'), 'status' ],
          [ fn('COUNT', col('id')), 'count' ],
        ],
        group: [ 'status' ],
        raw: true,
      }),
    ]);

    const totalOrders = totals ? parseInt(totals.total_orders) : 0;
    const totalAmount = totals ? parseFloat(totals.total_amount) : 0;
    let lastOrderDate = null;

    if (totals?.last_order_date) {
      lastOrderDate = typeof totals.last_order_date === 'string'
        ? totals.last_order_date
        : new Date(totals.last_order_date).toISOString();
    }

    const countByStatus = (byStatus || []).reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);

      return acc;
    }, {});

    return {
      doc: {
        total_orders: totalOrders,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        last_order_date: lastOrderDate,
        count_by_status: countByStatus,
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to get order stats');
  }
};

const getStatsOfOrdersCompleted = async () => {
  try {
    const result = await OrderModel.findAll({
      attributes: [
        [ fn('MONTH', col('created_at')), 'month' ],
        [ fn('SUM', col('total_amount')), 'total' ],
      ],
      where: {
        status: ORDER_STATUS.DELIVERED,
        payment_status: PAYMENT_STATUS.PAID,
      },
      group: [ fn('MONTH', col('created_at')) ],
      raw: true,
    });

    const monthMap = {
      1: 'January',
      2: 'February',
      3: 'March',
      4: 'April',
      5: 'May',
      6: 'June',
      7: 'July',
      8: 'August',
      9: 'September',
      10: 'October',
      11: 'November',
      12: 'December',
    };

    const fullStats = Object.entries(monthMap).map(([ num, name ]) => {
      const found = result.find((r) => parseInt(r.month) === parseInt(num));

      return {
        month: name,
        totalAmount: found ? parseFloat(found.total).toFixed(2) : '0.00',
      };
    });

    return { data: fullStats };
  } catch (error) {
    return handleServiceError(error, 'Failed to get stats of orders completed');
  }
};

// Helper: Validate order update request
const validateOrderUpdate = async (orderId, concurrencyStamp, updatedBy, transaction) => {
  const order = await OrderModel.findOne({
    where: { id: orderId },
    attributes: [
      'id',
      'order_number',
      'concurrency_stamp',
      'status',
      'vendor_id',
      'branch_id',
      'total_amount',
      'discount_amount',
      'shipping_charges',
      'final_amount',
    ],
    transaction,
  });

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (concurrencyStamp !== order.concurrency_stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  return { order };
};

// Helper: Calculate final amount for order
const calculateFinalAmount = (order, discountAmount, shippingCharges, finalAmount) => {
  if (finalAmount) {
    return finalAmount;
  }

  if (discountAmount || shippingCharges) {
    const currentTotal = order.total_amount;
    const newDiscount = discountAmount !== undefined ? discountAmount : order.discount_amount;
    const newShipping = shippingCharges !== undefined ? shippingCharges : order.shipping_charges;

    // final_amount = total_amount - discount_amount + shipping_charges
    return currentTotal - newDiscount + newShipping;
  }

  return null;
};

// Helper: Update rider stats based on order status change
const updateRiderStatsForOrder = async (orderId, oldStatus, newStatus, riderId, vendorId) => {
  // Only update stats if there's a rider assigned
  if (!riderId || !vendorId) {
    return null;
  }

  try {
    // When order is PICKED_UP (rider picks up the order) -> increment total_orders
    if (newStatus === ORDER_STATUS.PICKED_UP && oldStatus !== ORDER_STATUS.PICKED_UP) {
      await RiderStatsService.incrementTotalOrders(riderId, vendorId);
    }

    // When order is DELIVERED -> increment completed_orders and total_deliveries
    if (newStatus === ORDER_STATUS.DELIVERED && oldStatus !== ORDER_STATUS.DELIVERED) {
      // Increment total_deliveries
      await RiderStatsService.incrementTotalDeliveries(riderId, vendorId);

      // Also increment completed_orders (we need to update stats directly)
      const currentStats = await RiderStatsService.getRiderStats(riderId, vendorId);

      if (currentStats.doc) {
        await RiderStatsService.updateRiderStats(riderId, vendorId, {
          completed_orders: (currentStats.doc.completed_orders || 0) + 1,
        });
      } else {
        // Create new stats entry with completed_orders = 1
        await RiderStatsService.updateRiderStats(riderId, vendorId, {
          total_orders: 0,
          total_deliveries: 1,
          completed_orders: 1,
          cancelled_orders: 0,
        });
      }
    }

    // When order is CANCELLED -> increment cancelled_orders (only if rider was already assigned)
    if (newStatus === ORDER_STATUS.CANCELLED && oldStatus !== ORDER_STATUS.CANCELLED) {
      // Only increment if rider was already working on this order (was PICKED_UP or later)
      const riderAssignedStatuses = [
        ORDER_STATUS.PICKED_UP,
        ORDER_STATUS.ARRIVED,
        ORDER_STATUS.DELIVERED,
      ];

      if (riderAssignedStatuses.includes(oldStatus)) {
        const currentStats = await RiderStatsService.getRiderStats(riderId, vendorId);

        if (currentStats.doc) {
          await RiderStatsService.updateRiderStats(riderId, vendorId, {
            cancelled_orders: (currentStats.doc.cancelled_orders || 0) + 1,
          });
        } else {
          // Create new stats entry with cancelled_orders = 1
          await RiderStatsService.updateRiderStats(riderId, vendorId, {
            total_orders: 0,
            total_deliveries: 0,
            completed_orders: 0,
            cancelled_orders: 1,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error updating rider stats:', error);
    // Don't fail the order update if rider stats update fails
  }

  return null;
};

// Helper: Handle order status change (with role-wise validation)
const handleOrderStatusChange = async (orderId, oldStatus, newStatus, updatedBy, notes, transaction, roleName) => {
  if (!newStatus || newStatus === oldStatus) {
    return null;
  }

  // Validate that the status is a valid order status
  if (!isValidOrderStatus(newStatus)) {
    throw new ValidationError(`Invalid order status: ${newStatus}`);
  }

  // Validate that the transition from oldStatus to newStatus is allowed
  if (oldStatus && !canTransitionToStatus(oldStatus, newStatus)) {
    throw new ValidationError(
      `Cannot transition order status from ${oldStatus} to ${newStatus}. Allowed transitions from ${oldStatus} are: ${ORDER_STATUS_TRANSITIONS[oldStatus]?.join(', ') || 'none'}`,
    );
  }

  // Role-wise validation: user must have a role allowed for this transition
  if (oldStatus && newStatus) {
    if (!canTransitionByRole(oldStatus, newStatus, roleName)) {
      throw new ValidationError(
        `Your role does not have permission to change order status from ${oldStatus} to ${newStatus}`,
      );
    }
  }

  const statusHistoryDoc = {
    orderId,
    status: newStatus,
    previousStatus: oldStatus,
    changedBy: updatedBy,
    notes: notes || null,
  };

  await OrderStatusHistoryModel.create(convertCamelToSnake(statusHistoryDoc), {
    transaction,
  });

  return null;
};

// Helper: Handle order cancellation/return - restore inventory
// Optimized: Batch fetches variants and updates them in parallel
const handleOrderCancellation = async (orderId, orderNumber, vendorId, branchId, updatedBy, transaction, isReturn = false) => {
  const orderItems = await OrderItemModel.findAll({
    where: { order_id: orderId },
    attributes: [ 'id', 'product_id', 'variant_id', 'variant_name', 'quantity' ],
    transaction,
  });

  // Filter items with variants
  const itemsWithVariants = orderItems.filter((item) => item.variant_id);

  if (itemsWithVariants.length === 0) {
    return null;
  }

  // Batch fetch all variants in one query (optimized from individual queries)
  const variantIds = itemsWithVariants.map((item) => item.variant_id);
  const variants = await ProductVariantModel.findAll({
    where: {
      id: {
        [Op.in]: variantIds,
      },
    },
    attributes: [ 'id', 'quantity', 'product_id', 'items_per_unit', 'units' ],
    transaction,
  });

  // Create a map for quick variant lookup
  const variantMap = new Map(variants.map((v) => [ v.id, v ]));

  // Prepare variant updates and inventory movements
  const variantUpdates = [];
  const inventoryMovements = [];

  itemsWithVariants.forEach((item) => {
    const variant = variantMap.get(item.variant_id);

    if (variant) {
      const quantityBefore = variant.quantity;
      const quantityAfter = quantityBefore + item.quantity;
      const quantityChange = item.quantity; // Positive for REVERTED/RETURNED

      variantUpdates.push({
        id: item.variant_id,
        quantityAfter,
        quantityBefore,
        quantityChange,
        productId: variant.product_id,
        itemsPerUnit: variant.items_per_unit,
        currentUnits: variant.units,
      });

      // Create inventory movement (REVERTED for cancellation, RETURNED for returns)
      const movementType = isReturn ? INVENTORY_MOVEMENT_TYPE.RETURNED : INVENTORY_MOVEMENT_TYPE.REVERTED;
      const notes = isReturn
        ? `Order ${orderNumber || orderId} returned`
        : `Order ${orderNumber || orderId} cancelled`;

      inventoryMovements.push({
        productId: variant.product_id,
        variantId: item.variant_id,
        vendorId: vendorId || null,
        branchId: branchId || null,
        movementType,
        quantityChange,
        quantityBefore,
        quantityAfter,
        referenceType: 'ORDER',
        referenceId: orderId,
        userId: updatedBy,
        notes,
      });
    }
  });

  // Batch update all variants in parallel (optimized from sequential updates)
  await Promise.all(variantUpdates.map(async (update) => {
    const thresholdStock = update.thresholdStock || 0;
    const updateData = {
      quantity: update.quantityAfter,
      product_status: getProductStatusFromQuantity(update.quantityAfter, thresholdStock),
      concurrency_stamp: uuidV4(),
    };

    // Calculate and update units if items_per_unit is present
    if (update.itemsPerUnit && update.itemsPerUnit > 0) {
      const unitsToAdd = update.quantityChange / update.itemsPerUnit;
      const currentUnits = parseFloat(update.currentUnits) || 0;
      const newUnits = currentUnits + unitsToAdd;

      updateData.units = newUnits.toString();
    }

    await ProductVariantModel.update(
      updateData,
      {
        where: { id: update.id },
        transaction,
      },
    );
  }));

  // Create inventory movements in parallel (optimized from sequential)
  await Promise.all(inventoryMovements.map(async (movement) => {
    await InventoryMovementService.createInventoryMovement(movement, transaction);
  }));

  return null;
};

// Helper: Format branch details for notification data
const formatBranchDetails = (branch) => {
  if (!branch) {
    return {
      branch_name: '',
      branch_code: '',
      branch_address: '',
      branch_address_line_1: '',
      branch_address_line_2: '',
      branch_street: '',
      branch_city: '',
      branch_state: '',
      branch_pincode: '',
      branch_phone: '',
      branch_email: '',
    };
  }

  const branchName = branch.name || 'Branch';
  const branchAddress = `${branch.address_line_1 || ''} ${branch.address_line_2 || ''} ${branch.street || ''} ${branch.city || ''} ${branch.state || ''} ${branch.pincode || ''}`.trim();

  return {
    branch_name: branchName,
    branch_code: branch.code || '',
    branch_address: branchAddress,
    branch_address_line_1: branch.address_line_1 || '',
    branch_address_line_2: branch.address_line_2 || '',
    branch_street: branch.street || '',
    branch_city: branch.city || '',
    branch_state: branch.state || '',
    branch_pincode: branch.pincode || '',
    branch_phone: branch.phone || '',
    branch_email: branch.email || '',
  };
};

// Helper: Send FCM notification when order is ready for pickup
const sendReadyForPickupNotification = async (orderId, orderNumber, vendorId, branchId, branch, address, finalAmount) => {
  try {
    const addressText = address
      ? `${address.address_line_1 || ''} ${address.address_line_2 || ''} ${address.street || ''} ${address.landmark || ''} ${address.city || ''} ${address.state || ''} ${address.pincode || ''}`.trim()
      : 'Address not available';

    const branchName = branch?.name || 'Branch';
    const branchDetails = formatBranchDetails(branch);

    const title = 'New Order Ready for Pickup';
    const body = `Order ${orderNumber} is ready for pickup at ${branchName}`;

    const notificationData = {
      order_id: String(orderId),
      order_number: orderNumber,
      branch_id: String(branchId),
      vendor_id: String(vendorId),
      ...branchDetails,
      address: addressText,
      final_amount: String(finalAmount || 0),
      type: NOTIFICATION_TYPE.ORDER_READY_FOR_PICKUP,
    };

    const fcmResult = await sendFCMNotificationToRiders(
      vendorId,
      branchId,
      title,
      body,
      notificationData,
    );

    // Create in-app notification for riders
    await createOrderReadyForPickupNotification({
      orderId,
      orderNumber,
      vendorId,
      branchId,
      branch,
      address: addressText,
      finalAmount,
    });

    if (fcmResult.success) {
      console.log(`FCM notification sent to ${fcmResult.successCount} riders for order ${orderNumber}`);
    } else {
      console.warn(`Failed to send FCM notification for order ${orderNumber}:`, fcmResult.error);
    }
  } catch (fcmError) {
    console.error('Error sending FCM notification to riders:', fcmError);
    // Don't fail the order update if FCM fails
  }
};

// Helper: Handle post-update notifications
const handleOrderUpdateNotifications = async (orderId, newStatus, oldStatus, updatedBy) => {
  if (!newStatus || newStatus === oldStatus) {
    console.log(`[handleOrderUpdateNotifications] Skipping: no status change (orderId: ${orderId}, newStatus: ${newStatus}, oldStatus: ${oldStatus})`);

    return null;
  }

  // No notifications for RETURNED status
  if (newStatus === ORDER_STATUS.RETURNED) {
    console.log(`[handleOrderUpdateNotifications] Skipping: RETURNED status (orderId: ${orderId})`);

    return null;
  }

  try {
    console.log(`[handleOrderUpdateNotifications] Processing notifications for orderId: ${orderId}, newStatus: ${newStatus}, updatedBy: ${updatedBy}`);
    // Check if updatedBy user is a vendor admin
    const updatingUser = await UserModel.findOne({
      where: { id: updatedBy },
      attributes: [ 'id' ],
      include: [
        {
          model: UserRolesMappingModel,
          as: 'roleMappings',
          where: { status: 'ACTIVE' },
          required: false,
          include: [
            {
              model: RoleModel,
              as: 'role',
              attributes: [ 'id', 'name' ],
            },
          ],
        },
      ],
    });

    const isVendorAdmin = updatingUser?.roleMappings?.some(
      (mapping) => mapping.role?.name === ROLE.VENDOR_ADMIN,
    );

    // Skip socket notifications if updated by vendor admin
    const skipSocket = isVendorAdmin || false;

    const updatedOrder = await OrderModel.findOne({
      where: { id: orderId },
      attributes: [ 'id', 'order_number', 'branch_id', 'created_by', 'final_amount' ],
      include: [
        {
          model: BranchModel,
          as: 'branch',
          attributes: [
            'id',
            'vendor_id',
            'name',
            'code',
            'address_line_1',
            'address_line_2',
            'street',
            'city',
            'state',
            'pincode',
            'latitude',
            'longitude',
            'phone',
            'email',
          ],
          required: false,
        },
        {
          model: AddressModel,
          as: 'address',
          attributes: [ 'id', 'address_line_1', 'address_line_2', 'street', 'landmark', 'city', 'state', 'pincode', 'phone', 'email' ],
          required: false,
        },
      ],
    });

    if (!updatedOrder) {
      console.warn(`[handleOrderUpdateNotifications] Order ${orderId} not found - may have been deleted or query failed`);

      return null;
    }

    console.log(`[handleOrderUpdateNotifications] Order found: ${updatedOrder.id}, orderNumber: ${updatedOrder.order_number}`);

    const isUserUpdater = updatedBy === updatedOrder.created_by;

    // Determine notification targets based on status and who updated
    let notifyUser = true;
    let notifyVendorAdmin = true;

    if (newStatus === ORDER_STATUS.PICKED_UP || newStatus === ORDER_STATUS.ARRIVED) {
      notifyVendorAdmin = false;
    } else if (newStatus === ORDER_STATUS.CANCELLED) {
      if (isVendorAdmin) {
        notifyVendorAdmin = false; // admin cancels -> notify user only
        notifyUser = true;
      } else if (isUserUpdater) {
        notifyUser = false; // user cancels -> notify admin only
        notifyVendorAdmin = true;
      } else {
        notifyUser = false;
        notifyVendorAdmin = true;
      }
    } else if (newStatus === ORDER_STATUS.REJECTED) {
      // REJECTED is always from vendor/admin -> notify user only
      notifyVendorAdmin = false;
      notifyUser = true;
    } else if (newStatus === ORDER_STATUS.RETURN) {
      notifyUser = false;
      notifyVendorAdmin = true; // return request -> vendor admin only
    }

    // Create standard order update notification (respect notification targets)
    await createOrderUpdatedNotification({
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.order_number,
      vendorId: updatedOrder.branch?.vendor_id,
      branchId: updatedOrder.branch_id,
      branch: updatedOrder.branch,
      status: newStatus,
      userId: updatedOrder.created_by,
      updatedBy,
    }, {
      skipSocket,
      notifyUser,
      notifyVendorAdmin,
    });

    // Send FCM notification to riders when order is ready for pickup
    if (newStatus === ORDER_STATUS.READY_FOR_PICKUP && updatedOrder.branch?.vendor_id) {
      const { address } = updatedOrder;

      await sendReadyForPickupNotification(
        updatedOrder.id,
        updatedOrder.order_number,
        updatedOrder.branch.vendor_id,
        updatedOrder.branch_id,
        updatedOrder.branch,
        address,
        updatedOrder.final_amount,
      );
    }

    // Send FCM notification to user when order is accepted
    if (newStatus === ORDER_STATUS.ACCEPTED && updatedOrder.created_by) {
      try {
        const title = 'Order Accepted';
        const body = `Your order ${updatedOrder.order_number} has been accepted and is being prepared`;

        const branchDetails = formatBranchDetails(updatedOrder.branch);

        const notificationData = {
          order_id: String(updatedOrder.id),
          order_number: updatedOrder.order_number,
          status: ORDER_STATUS.ACCEPTED,
          vendor_id: String(updatedOrder.branch?.vendor_id || ''),
          branch_id: String(updatedOrder.branch_id || ''),
          ...branchDetails,
        };

        const fcmResult = await sendFCMNotificationToUser(
          updatedOrder.created_by,
          title,
          body,
          notificationData,
        );

        // Create in-app notification
        await createOrderAcceptedNotification({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.order_number,
          vendorId: updatedOrder.branch?.vendor_id,
          branchId: updatedOrder.branch_id,
          branch: updatedOrder.branch,
          userId: updatedOrder.created_by,
        });

        if (fcmResult.success) {
          console.log(`FCM notification sent to user for order ${updatedOrder.order_number} (ACCEPTED)`);
        } else {
          console.warn(`Failed to send FCM notification for order ${updatedOrder.order_number}:`, fcmResult.error);
        }
      } catch (fcmError) {
        console.error('Error sending FCM notification to user (ACCEPTED):', fcmError);
        // Don't fail the order update if FCM fails
      }
    }

    // Send FCM notification to user when order arrives
    if (newStatus === ORDER_STATUS.ARRIVED && updatedOrder.created_by) {
      try {
        const title = 'Order Arrived';
        const body = `Your order ${updatedOrder.order_number} has arrived and is ready for delivery`;

        const branchDetails = formatBranchDetails(updatedOrder.branch);

        const notificationData = {
          order_id: String(updatedOrder.id),
          order_number: updatedOrder.order_number,
          status: ORDER_STATUS.ARRIVED,
          vendor_id: String(updatedOrder.branch?.vendor_id || ''),
          branch_id: String(updatedOrder.branch_id || ''),
          ...branchDetails,
        };

        const fcmResult = await sendFCMNotificationToUser(
          updatedOrder.created_by,
          title,
          body,
          notificationData,
        );

        // Create in-app notification
        await createOrderArrivedNotification({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.order_number,
          vendorId: updatedOrder.branch?.vendor_id,
          branchId: updatedOrder.branch_id,
          branch: updatedOrder.branch,
          userId: updatedOrder.created_by,
        });

        if (fcmResult.success) {
          console.log(`FCM notification sent to user for order ${updatedOrder.order_number} (ARRIVED)`);
        } else {
          console.warn(`Failed to send FCM notification for order ${updatedOrder.order_number}:`, fcmResult.error);
        }
      } catch (fcmError) {
        console.error('Error sending FCM notification to user (ARRIVED):', fcmError);
        // Don't fail the order update if FCM fails
      }
    }

    return null;
  } catch (error) {
    console.error('Error creating order update notification:', error);

    return null;
  }
};

const updateOrder = async (data) => withTransaction(sequelize, async (transaction) => {
  const { id, loginUser, ...datas } = data;
  const {
    concurrencyStamp,
    updatedBy,
    status: newStatus,
    notes,
    discountAmount,
    shippingCharges,
    finalAmount,
  } = datas;

  // Validate order update and fetch order/user data
  const { order: response } = await validateOrderUpdate(
    id,
    concurrencyStamp,
    updatedBy,
    transaction,
  );

  const modifiedData = { ...data };
  const oldStatus = response.status;

  const roleName = loginUser?.roleName;

  if (roleName === ROLE.RIDER) {
    modifiedData.riderId = loginUser?.id ?? updatedBy;
  }

  // Calculate final amount
  const calculatedFinalAmount = calculateFinalAmount(
    response,
    discountAmount,
    shippingCharges,
    finalAmount,
  );

  if (calculatedFinalAmount) {
    modifiedData.finalAmount = calculatedFinalAmount;
  }

  // Handle status change (includes role-wise validation)
  await handleOrderStatusChange(
    id,
    oldStatus,
    newStatus,
    updatedBy,
    notes,
    transaction,
    roleName,
  );

  // Update rider stats based on status change
  // Get rider_id from modifiedData (may be set if user is a rider) or from response
  const riderId = modifiedData.riderId || response.rider_id;
  const vendorId = response.vendor_id;

  if (riderId && vendorId) {
    // Update rider stats after transaction commit to avoid blocking
    transaction.afterCommit(async () => {
      await updateRiderStatsForOrder(id, oldStatus, newStatus, riderId, vendorId);
    });
  }

  // Handle order cancellation/rejection/return - restore inventory
  // Consolidate multiple status checks into a single operation
  const statusesRequiringInventoryRestore = [
    { status: ORDER_STATUS.CANCELLED, isReturn: false },
    { status: ORDER_STATUS.REJECTED, isReturn: false },
    { status: ORDER_STATUS.RETURNED, isReturn: true },
  ];

  const statusRequiringRestore = statusesRequiringInventoryRestore.find(
    (s) => newStatus === s.status && oldStatus !== s.status,
  );

  if (statusRequiringRestore) {
    await handleOrderCancellation(
      id,
      response.order_number,
      response.vendor_id,
      response.branch_id,
      updatedBy,
      transaction,
      statusRequiringRestore.isReturn,
    );
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(modifiedData),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  await OrderModel.update(doc, {
    where: { id },
    transaction,
  });

  // Handle notifications after transaction commit
  if (newStatus && newStatus !== oldStatus) {
    transaction.afterCommit(async () => {
      await handleOrderUpdateNotifications(id, newStatus, oldStatus, updatedBy);
    });
  }

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => handleServiceError(error, 'Transaction failed'));

const getTotalReturnsOfToday = async () => {
  try {
    const todayStart = new Date();

    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();

    todayEnd.setHours(23, 59, 59, 999);

    const result = await OrderModel.findAll({
      attributes: [ [ fn('SUM', col('total_amount')), 'total' ] ],
      where: {
        status: ORDER_STATUS.DELIVERED,
        payment_status: PAYMENT_STATUS.PAID,
        created_at: { [Op.between]: [ todayStart, todayEnd ] },
      },
      raw: true,
    });
    const total = result[0].total || 0;

    return { data: parseFloat(total).toFixed(2) };
  } catch (error) {
    return handleServiceError(error, 'Failed to get total returns of today');
  }
};

const getOrderDetails = async (orderId) => {
  try {
    const whereClause = { id: orderId };

    const order = await OrderModel.findOne({
      where: whereClause,
      attributes: [
        'id',
        'order_number',
        'rider_id',
        'total_amount',
        'discount_amount',
        'shipping_charges',
        'final_amount',
        'order_priority',
        'estimated_delivery_time',
        'distance',
        'distance_method',
        'estimated_delivery_eta',
        'status',
        'payment_status',
        'created_at',
        'updated_at',
        'concurrency_stamp',
      ],
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'email', 'mobile_number' ],
        },
        {
          model: UserModel,
          as: 'riderDetails',
          attributes: [ 'id', 'name', 'mobile_number' ],
          required: false,
        },
        {
          model: AddressModel,
          as: 'address',
          attributes: [
            'id',
            'address_line_1',
            'address_line_2',
            'street',
            'landmark',
            'city',
            'state',
            'country',
            'pincode',
            'latitude',
            'longitude',
            'name',
            'mobile_number',
            'phone',
            'email',
          ],
        },
        {
          model: OrderItemModel,
          as: 'orderItems',
          attributes: [
            'id',
            'product_id',
            'variant_id',
            'variant_name',
            'quantity',
            'price_at_purchase',
            'combo_id',
            'subtotal',
            'discount_amount',
          ],
          include: [
            {
              model: ProductModel,
              as: 'product',
              attributes: [
                'id',
                'title',
              ],
              required: false,
            },
            {
              model: ProductVariantModel,
              as: 'variant',
              attributes: [
                'id',
                'variant_name',
                'selling_price',
              ],
              required: false,
              include: [
                {
                  model: ProductModel,
                  as: 'product',
                  attributes: [ 'id', 'title' ],
                  include: [
                    {
                      model: ProductImageModel,
                      as: 'images',
                      where: { status: 'ACTIVE', is_default: 1 },
                      required: false,
                      attributes: [ 'id', 'image_url', 'is_default', 'display_order' ],
                      limit: 1,
                    },
                  ],
                },
              ],
            },
            {
              model: VariantComboDiscountModel,
              as: 'comboDiscount',
              attributes: [
                'id',
                'combo_quantity',
              ],
              required: false,
            },
          ],
        },
        {
          model: OrderDiscountModel,
          as: 'orderDiscount',
          attributes: [
            'id',
            'discount_type',
            'discount_amount',
            'discount_percentage',
            'original_amount',
            'final_amount',
          ],
          include: [
            {
              model: OfferModel,
              as: 'offer',
              attributes: [ 'id', 'code', 'description', 'status' ],
              required: false,
            },
            {
              model: PromocodeModel,
              as: 'promocode',
              attributes: [ 'id', 'code', 'description', 'status' ],
              required: false,
            },
          ],
          required: false,
        },
        {
          model: OrderStatusHistoryModel,
          as: 'orderStatusHistory',
          attributes: [
            'id',
            'status',
            'previous_status',
            'notes',
            'created_at',
            'updated_at',
          ],
          include: [
            {
              model: UserModel,
              as: 'changedByUser',
              attributes: [ 'id', 'name', 'email' ],
              required: false,
            },
          ],
          required: false,
          order: [ [ 'created_at', 'ASC' ] ],
        },
      ],
    });

    if (!order) {
      return handleServiceError(new NotFoundError('Order not found'));
    }

    // Transform the data to match the UI structure
    const orderData = order.toJSON();

    // Use DB values for order items (subtotal and discount_amount are already calculated)
    const orderItems = orderData.orderItems.map((item) => {
      const {
        price_at_purchase: unitPrice,
        quantity,
        combo_id: comboId,
        subtotal: itemSubtotal,
        discount_amount: itemDiscount,
      } = item;

      const comboQuantity = item.comboDiscount?.combo_quantity ?? null;

      // Calculate item total from DB values
      const itemTotal = itemSubtotal - itemDiscount;

      // Use variant data if available, otherwise use product data
      const productId = item.variant?.product?.id || item.product?.id;
      const productTitle = item.variant?.product?.title || item.product?.title;
      const productImage = item.variant?.product?.images?.[0]?.image_url || null;
      const variantId = item.variant?.id || null;
      const variantName = item.variant?.variant_name || item.variant_name || null;
      const variantPrice = item.variant?.selling_price || unitPrice;

      return {
        id: item.id,
        product: {
          id: productId,
          title: productTitle,
          image: productImage,
        },
        variant: variantId ? {
          id: variantId,
          name: variantName,
          selling_price: variantPrice,
        } : null,
        quantity,
        unit_price: parseFloat(unitPrice.toFixed(2)),
        discount: parseFloat(itemDiscount.toFixed(2)),
        total: parseFloat(itemTotal.toFixed(2)),
        subtotal: parseFloat(itemSubtotal.toFixed(2)),
        combo_id: comboId || null,
        combo_quantity: comboQuantity,
      };
    });

    // Prepare applied discounts
    const appliedDiscounts = [];
    const orderDiscountData = orderData.orderDiscount;
    let discounts = [];

    if (Array.isArray(orderDiscountData)) {
      discounts = orderDiscountData;
    } else if (orderDiscountData) {
      discounts = [ orderDiscountData ];
    }

    discounts.forEach((discount) => {
      if (discount.discount_type === 'PROMOCODE' && discount.promocode) {
        appliedDiscounts.push({
          type: 'promocode',
          code: discount.promocode.code,
          description: discount.promocode.description || `${discount.discount_percentage}% off`,
          discount_amount: parseFloat(discount.discount_amount.toFixed(2)),
          status: discount.promocode.status || 'ACTIVE',
        });
      }

      if (discount.discount_type === 'OFFER' && discount.offer) {
        appliedDiscounts.push({
          type: 'offer',
          code: discount.offer.code,
          description: discount.offer.description || `₹${discount.discount_amount} off`,
          discount_amount: parseFloat(discount.discount_amount.toFixed(2)),
          status: discount.offer.status || 'ACTIVE',
        });
      }
    });

    // Calculate summary
    const subtotal = parseFloat(orderData.total_amount.toFixed(2));
    const totalDiscount = parseFloat(orderData.discount_amount.toFixed(2));
    const shipping = parseFloat(orderData.shipping_charges.toFixed(2));
    const total = parseFloat(orderData.final_amount.toFixed(2));

    // Format delivery address
    const deliveryAddress = orderData.address ? {
      recipient_name: orderData.address.name,
      address_line_1: orderData.address.address_line_1 || '',
      address_line_2: orderData.address.address_line_2 || '',
      street_details: orderData.address.street || '',
      landmark: orderData.address.landmark || '',
      city: orderData.address.city || '',
      state: orderData.address.state || '',
      country: orderData.address.country || 'India',
      postal_code: orderData.address.pincode || '',
      mobile_number: orderData.address.mobile_number,
      phone: orderData.address.phone || '',
      email: orderData.address.email || '',
    } : null;

    // Calculate estimated delivery date
    let estimatedDeliveryDate = null;

    if (orderData.estimated_delivery_time) {
      const deliveryDate = new Date(orderData.created_at);

      deliveryDate.setMinutes(deliveryDate.getMinutes() + orderData.estimated_delivery_time);
      estimatedDeliveryDate = deliveryDate.toISOString();
    }

    // Format order status history
    const statusHistory = (orderData.orderStatusHistory || []).map((history) => ({
      id: history.id,
      status: history.status,
      previous_status: history.previous_status,
      notes: history.notes || null,
      changed_by: history.changedByUser ? {
        id: history.changedByUser.id,
        name: history.changedByUser.name,
        email: history.changedByUser.email,
      } : null,
      changed_at: history.created_at,
    }));

    // Rider details: only when order has rider_id
    let riderPickupTime = null;

    if (orderData.rider_id) {
      const pickedUpHistory = (orderData.orderStatusHistory || []).find(
        (h) => h.status === ORDER_STATUS.PICKED_UP,
      );

      if (pickedUpHistory?.created_at) {
        riderPickupTime = typeof pickedUpHistory.created_at === 'string'
          ? pickedUpHistory.created_at
          : new Date(pickedUpHistory.created_at).toISOString();
      }
    }

    const riderInformation = orderData.rider_id
      ? {
        rider_name: orderData.riderDetails?.name || null,
        rider_phone_number: orderData.riderDetails?.mobile_number || null,
        rider_pickup_time: riderPickupTime,
      }
      : null;

    // Format response to match UI structure
    const response = {
      order_id: orderData.id,
      order_number: orderData.order_number,
      concurrency_stamp: orderData.concurrency_stamp,
      order_items: orderItems,
      summary: {
        subtotal,
        discount: totalDiscount,
        shipping,
        total,
      },
      applied_discounts: appliedDiscounts,
      customer_information: {
        name: orderData.user?.name || '',
        email: orderData.user?.email || '',
        mobile_number: orderData.user?.mobile_number || '',
      },
      delivery_address: deliveryAddress,
      rider_information: riderInformation,
      order_information: {
        order_date: orderData.created_at,
        estimated_delivery: estimatedDeliveryDate,
        priority: orderData.order_priority,
        payment_status: orderData.payment_status,
        order_status: orderData.status,
      },
      status_history: statusHistory,
    };

    // Convert image URLs to CloudFront URLs (recursively handles nested objects/arrays)
    const responseWithCloudFront = convertImageFieldsToCloudFront(JSON.parse(JSON.stringify(response)), [ 'image' ]);

    return { doc: responseWithCloudFront };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch order details');
  }
};

module.exports = {
  placeOrder,
  getOrder,
  getOrderStats,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
  getOrderDetails,
};
