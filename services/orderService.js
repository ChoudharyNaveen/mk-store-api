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
const { createOrderPlacedNotification, createOrderUpdatedNotification, createOrderReadyForPickupNotification } = require('./notificationService');
const { sendFCMNotificationToRiders } = require('./fcmService');
const ShippingService = require('./shippingService');
const InventoryMovementService = require('./inventoryMovementService');
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
const generateOrderNumber = async (transaction) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
  const prefix = `ORD-${dateStr}-`;

  // Get the last order number for today
  const lastOrder = await OrderModel.findOne({
    where: {
      order_number: {
        [Op.like]: `${prefix}%`,
      },
    },
    attributes: [ 'order_number' ],
    order: [ [ 'order_number', 'DESC' ] ],
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
    attributes: [ 'id', 'product_id', 'variant_id', 'vendor_id', 'branch_id', 'quantity', 'created_by' ],
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
const calculateOrderAmount = (cartItems) => {
  let totalAmount = 0;
  const validationResults = cartItems.map((item) => {
    const { quantity, variant } = item;

    if (!variant) {
      return {
        errors: { message: `Product variant with id ${item.variant_id} not found` },
      };
    }

    const price = variant.selling_price;
    const itemTitle = variant.variant_name;
    const currentQuantity = variant.quantity;
    const itemConcurrencyStamp = variant.concurrency_stamp;
    const itemProductId = variant.product_id;
    const itemVariantId = variant.id;
    const itemVariantName = variant.variant_name;

    const subtotal = price * quantity;

    if (quantity > currentQuantity) {
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
        quantity,
        price_at_purchase: price,
        product_quantity: currentQuantity,
        product_concurrency_stamp: itemConcurrencyStamp,
      },
      subtotal,
    };
  });

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
    addressId, houseNo, addressLine2, streetDetails, landmark, city, state, country, postalCode, name, mobileNumber,
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

  if (houseNo && streetDetails && city && state && postalCode && name && mobileNumber) {
    const addressConcurrencyStamp = uuidV4();

    const doc = {
      concurrencyStamp: addressConcurrencyStamp,
      houseNo,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      addressLine2: addressLine2 || null,
      streetDetails,
      landmark: landmark || null,
      city,
      state,
      country: country || 'India',
      postalCode,
      name,
      mobileNumber,
      createdBy,
    };

    const address = await AddressModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    return address;
  }

  throw new ValidationError('Address not found. Please provide address details(houseNo, streetDetails, city, state, postalCode, name, mobileNumber) or addressId.');
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
const createOrderItemsAndReduceInventory = async (orderItemsData, orderId, orderNumber, vendorId, branchId, createdBy, transaction) => {
  await Promise.all(orderItemsData.map(async (item) => {
    const itemDoc = {
      concurrencyStamp: uuidV4(),
      orderId,
      productId: item.product_id,
      variantId: item.variant_id || null,
      variantName: item.variant_name || null,
      quantity: item.quantity,
      priceAtPurchase: item.price_at_purchase,
      createdBy,
    };

    await OrderItemModel.create(convertCamelToSnake(itemDoc), {
      transaction,
    });

    const quantityRemaining = item.product_quantity - item.quantity;
    const quantityChange = -item.quantity;

    await ProductVariantModel.update(
      {
        quantity: quantityRemaining,
        product_status: quantityRemaining > 0 ? 'INSTOCK' : 'OUT-OF-STOCK',
        concurrency_stamp: uuidV4(),
      },
      {
        where: { id: item.variant_id },
        transaction,
      },
    );

    await InventoryMovementService.createInventoryMovement({
      productId: item.product_id,
      variantId: item.variant_id,
      vendorId,
      branchId,
      movementType: 'REMOVED',
      quantityChange,
      quantityBefore: item.product_quantity,
      quantityAfter: quantityRemaining,
      referenceType: 'ORDER',
      referenceId: orderId,
      userId: createdBy,
      notes: `Order ${orderNumber}`,
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
  const { totalAmount, orderItemsData } = calculateOrderAmount(cartItems);

  // Handle address
  const address = await handleOrderAddress(data, createdBy, transaction);

  // Apply discounts
  let discountApplied = false;
  let discountType = null;
  let discountId = null;
  let discountPercentage = 0;
  let discountAmount = 0;
  const originalAmount = totalAmount;

  let discountedTotal = totalAmount;

  if (offerCode) {
    const offerResult = await applyOfferDiscount(offerCode, totalAmount, transaction);

    discountApplied = offerResult.discountApplied;
    discountType = offerResult.discountType;
    discountId = offerResult.discountId;
    discountPercentage = offerResult.discountPercentage;
    discountAmount = offerResult.discountAmount;
    discountedTotal = totalAmount - discountAmount;
  } else if (promocodeId) {
    const promocodeResult = await applyPromocodeDiscount(promocodeId, branchId, totalAmount, transaction);

    discountApplied = promocodeResult.discountApplied;
    discountType = promocodeResult.discountType;
    discountId = promocodeResult.discountId;
    discountPercentage = promocodeResult.discountPercentage;
    discountAmount = promocodeResult.discountAmount;
    discountedTotal = totalAmount - discountAmount;
  }

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
    discountAmount,
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
    refundStatus: 'NONE',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
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
  if (discountApplied) {
    const discountDoc = {
      concurrencyStamp: uuidV4(),
      orderId: newOrder.id,
      discountType,
      discountAmount,
      discountPercentage,
      originalAmount,
      finalAmount: totalAmount,
      createdBy,
    };

    if (discountType === 'OFFER') {
      discountDoc.offerId = discountId;
    } else if (discountType === 'PROMOCODE') {
      discountDoc.promocodeId = discountId;
    }

    await OrderDiscountModel.create(convertCamelToSnake(discountDoc), {
      transaction,
    });
  }

  // Create initial status history
  const statusHistoryDoc = {
    orderId: newOrder.id,
    status: 'PENDING',
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
    transaction,
  );

  // Clear user's cart
  await clearUserCart(createdBy, transaction);

  // Create notification for new order (after transaction commit)
  transaction.afterCommit(async () => {
    try {
      await createOrderPlacedNotification({
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        vendorId: branchVendorId,
        branchId,
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

  const where = generateWhereCondition(filters);
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
          attributes: [ 'id', 'product_id', 'variant_id', 'variant_name', 'quantity', 'price_at_purchase' ],
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
              attributes: [ 'id', 'variant_name', 'variant_type' ],
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

const getStatsOfOrdersCompleted = async () => {
  try {
    const result = await OrderModel.findAll({
      attributes: [
        [ fn('MONTH', col('created_at')), 'month' ],
        [ fn('SUM', col('total_amount')), 'total' ],
      ],
      where: {
        status: 'DELIVERED',
        payment_status: 'PAID',
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
  const [ order, user ] = await Promise.all([
    OrderModel.findOne({
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
    }),
    UserModel.findOne({
      where: { id: updatedBy },
      attributes: [ 'id' ],
      include: [
        {
          model: RoleModel,
          as: 'role',
          attributes: [ 'id', 'name' ],
        },
      ],
      transaction,
    }),
  ]);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (concurrencyStamp !== order.concurrency_stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  return { order, user };
};

// Helper: Calculate final amount for order
const calculateFinalAmount = (order, discountAmount, shippingCharges, finalAmount) => {
  if (finalAmount !== undefined) {
    return finalAmount;
  }

  if (discountAmount !== undefined || shippingCharges !== undefined) {
    const currentTotal = order.total_amount;
    const newDiscount = discountAmount !== undefined ? discountAmount : order.discount_amount;
    const newShipping = shippingCharges !== undefined ? shippingCharges : order.shipping_charges;

    // final_amount = total_amount - discount_amount + shipping_charges
    return currentTotal - newDiscount + newShipping;
  }

  return null;
};

// Helper: Handle order status change
const handleOrderStatusChange = async (orderId, oldStatus, newStatus, updatedBy, notes, transaction) => {
  if (!newStatus || newStatus === oldStatus) {
    return null;
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

// Helper: Handle order cancellation - restore inventory
const handleOrderCancellation = async (orderId, orderNumber, vendorId, branchId, updatedBy, transaction) => {
  const orderItems = await OrderItemModel.findAll({
    where: { order_id: orderId },
    attributes: [ 'id', 'product_id', 'variant_id', 'variant_name', 'quantity' ],
    transaction,
  });

  // Restore quantities for each order item
  await Promise.all(orderItems.map(async (item) => {
    if (item.variant_id) {
      const variant = await ProductVariantModel.findOne({
        where: { id: item.variant_id },
        attributes: [ 'id', 'quantity', 'product_id' ],
        transaction,
      });

      if (variant) {
        const quantityBefore = variant.quantity;
        const quantityAfter = quantityBefore + item.quantity;
        const quantityChange = item.quantity; // Positive for REVERTED

        await ProductVariantModel.update(
          {
            quantity: quantityAfter,
            product_status: quantityAfter > 0 ? 'INSTOCK' : 'OUT-OF-STOCK',
            concurrency_stamp: uuidV4(),
          },
          {
            where: { id: item.variant_id },
            transaction,
          },
        );

        // Create inventory movement (REVERTED)
        await InventoryMovementService.createInventoryMovement({
          productId: variant.product_id,
          variantId: item.variant_id,
          vendorId: vendorId || null,
          branchId: branchId || null,
          movementType: 'REVERTED',
          quantityChange,
          quantityBefore,
          quantityAfter,
          referenceType: 'ORDER',
          referenceId: orderId,
          userId: updatedBy,
          notes: `Order ${orderNumber || orderId} cancelled`,
        }, transaction);
      }
    }
  }));

  return null;
};

// Helper: Send FCM notification when order is ready for pickup
const sendReadyForPickupNotification = async (orderId, orderNumber, vendorId, branchId, branchName, address, finalAmount) => {
  try {
    const addressText = address
      ? `${address.address_line1 || ''} ${address.address_line2 || ''} ${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.pincode || ''}`.trim()
      : 'Address not available';

    const title = 'New Order Ready for Pickup';
    const body = `Order ${orderNumber} is ready for pickup at ${branchName}`;

    const notificationData = {
      order_id: String(orderId),
      order_number: orderNumber,
      branch_id: String(branchId),
      vendor_id: String(vendorId),
      branch_name: branchName,
      address: addressText,
      final_amount: String(finalAmount || 0),
      type: 'ORDER_READY_FOR_PICKUP',
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
      branchName,
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
    return null;
  }

  try {
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
      (mapping) => mapping.role?.name === 'VENDOR_ADMIN',
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
          attributes: [ 'vendor_id', 'name' ],
        },
        {
          model: AddressModel,
          as: 'address',
          attributes: [ 'id', 'address_line1', 'address_line2', 'street', 'city', 'state', 'pincode' ],
        },
      ],
    });

    if (!updatedOrder) {
      return null;
    }

    // Create standard order update notification (skip socket if vendor admin)
    await createOrderUpdatedNotification({
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.order_number,
      vendorId: updatedOrder.branch?.vendor_id,
      branchId: updatedOrder.branch_id,
      status: newStatus,
      userId: updatedOrder.created_by,
      updatedBy,
    }, skipSocket);

    // Send FCM notification to riders when order is ready for pickup
    if (newStatus === 'READYFORPICKUP' && updatedOrder.branch?.vendor_id) {
      const branchName = updatedOrder.branch?.name || 'Branch';
      const { address } = updatedOrder;

      await sendReadyForPickupNotification(
        updatedOrder.id,
        updatedOrder.order_number,
        updatedOrder.branch.vendor_id,
        updatedOrder.branch_id,
        branchName,
        address,
        updatedOrder.final_amount,
      );
    }

    return null;
  } catch (error) {
    console.error('Error creating order update notification:', error);

    return null;
  }
};

const updateOrder = async (data) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
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
  const { order: response, user: riderExist } = await validateOrderUpdate(
    id,
    concurrencyStamp,
    updatedBy,
    transaction,
  );

  const modifiedData = { ...data };
  const oldStatus = response.status;

  // Assign rider if user is a rider
  if (riderExist?.role?.name === 'RIDER') {
    modifiedData.riderId = updatedBy;
  }

  // Calculate final amount
  const calculatedFinalAmount = calculateFinalAmount(
    response,
    discountAmount,
    shippingCharges,
    finalAmount,
  );

  if (calculatedFinalAmount !== undefined) {
    modifiedData.finalAmount = calculatedFinalAmount;
  }

  // Handle status change
  await handleOrderStatusChange(
    id,
    oldStatus,
    newStatus,
    updatedBy,
    notes,
    transaction,
  );

  // Handle order cancellation - restore inventory
  if (newStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
    await handleOrderCancellation(
      id,
      response.order_number,
      response.vendor_id,
      response.branch_id,
      updatedBy,
      transaction,
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
        status: 'DELIVERED',
        payment_status: 'PAID',
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
      ],
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'email', 'mobile_number' ],
        },
        {
          model: AddressModel,
          as: 'address',
          attributes: [
            'id',
            'house_no',
            'address_line_2',
            'street_details',
            'landmark',
            'city',
            'state',
            'country',
            'postal_code',
            'latitude',
            'longitude',
            'name',
            'mobile_number',
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
                'variant_type',
                'variant_value',
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
      ],
    });

    if (!order) {
      return handleServiceError(new NotFoundError('Order not found'));
    }

    // Transform the data to match the UI structure
    const orderData = order.toJSON();

    // Calculate item-level discounts and totals
    const orderItems = orderData.orderItems.map((item) => {
      const { price_at_purchase: unitPrice, quantity } = item;

      const itemSubtotal = unitPrice * quantity;

      // Calculate discount per item (proportional to total discount)
      // If there's a discount, distribute it proportionally
      let itemDiscount = 0;

      if (orderData.discount_amount > 0 && orderData.total_amount > 0) {
        const discountRatio = orderData.discount_amount / orderData.total_amount;

        itemDiscount = itemSubtotal * discountRatio;
      }

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
      address_line_1: orderData.address.house_no,
      address_line_2: orderData.address.address_line_2 || '',
      street_details: orderData.address.street_details,
      landmark: orderData.address.landmark || '',
      city: orderData.address.city,
      state: orderData.address.state,
      country: orderData.address.country,
      postal_code: orderData.address.postal_code,
      mobile_number: orderData.address.mobile_number,
    } : null;

    // Calculate estimated delivery date
    let estimatedDeliveryDate = null;

    if (orderData.estimated_delivery_time) {
      const deliveryDate = new Date(orderData.created_at);

      deliveryDate.setMinutes(deliveryDate.getMinutes() + orderData.estimated_delivery_time);
      estimatedDeliveryDate = deliveryDate.toISOString();
    }

    // Format response to match UI structure
    const response = {
      order_id: orderData.id,
      order_number: orderData.order_number,
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
      order_information: {
        order_date: orderData.created_at,
        estimated_delivery: estimatedDeliveryDate,
        priority: orderData.order_priority,
        payment_status: orderData.payment_status,
        order_status: orderData.status,
      },
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
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
  getOrderDetails,
};
