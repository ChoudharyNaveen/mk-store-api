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
const { createOrderPlacedNotification, createOrderUpdatedNotification } = require('./notificationService');
const ShippingService = require('./shippingService');
const InventoryMovementService = require('./inventoryMovementService');
const {
  ValidationError,
  NotFoundError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

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

const placeOrder = async (data) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy,
    vendorId,
    branchId,
    addressId,
    houseNo,
    addressLine2,
    streetDetails,
    landmark,
    city,
    state,
    country,
    postalCode,
    name,
    mobileNumber,
    offerCode,
    promocodeId,
    orderPriority,
    estimatedDeliveryTime,
    shippingCharges,
  } = data;

  // Verify branch exists
  if (!branchId) {
    throw new ValidationError('branchId is required');
  }

  if (!vendorId) {
    throw new ValidationError('vendorId is required');
  }

  // Validate that only one discount type is provided
  if (offerCode && promocodeId) {
    throw new ValidationError('Cannot apply both offer code and promo code. Please choose one.');
  }

  const branch = await BranchModel.findOne({
    where: { id: branchId, vendor_id: vendorId },
    attributes: [ 'id', 'vendor_id' ],
    transaction,
  });

  if (!branch) {
    throw new ValidationError('Branch not found or does not belong to the specified vendor');
  }

  // Use provided vendorId
  const branchVendorId = vendorId;

  const cartItems = await CartModel.findAll({
    where: {
      created_by: createdBy,
      status: 'ACTIVE',
      vendor_id: branchVendorId,
      branch_id: branchId,
    },
    attributes: [ 'id', 'product_id', 'variant_id', 'vendor_id', 'branch_id', 'quantity', 'created_by' ],
    include: [
      {
        model: ProductVariantModel,
        as: 'variant',
        attributes: [ 'id', 'variant_name', 'product_id', 'selling_price', 'quantity', 'concurrency_stamp' ],
        required: true, // Variant is required
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

  // Validate that all cart items have variants
  const invalidItems = cartItems.filter((item) => !item.variant_id || !item.variant);

  if (invalidItems.length > 0) {
    throw new ValidationError('All cart items must have a variant. Products without variants are not supported.');
  }

  // Fetch all variants for validation and quantity checks
  const variantIds = cartItems.map((item) => item.variant_id).filter(Boolean);

  const variants = await ProductVariantModel.findAll({
    where: { id: { [Op.in]: variantIds } },
    attributes: [ 'id', 'variant_name', 'product_id', 'quantity', 'selling_price', 'concurrency_stamp' ],
    transaction,
  });

  const variantMap = new Map(variants.map((v) => [ v.id, v ]));

  // Calculate total amount and validate quantities
  let totalAmount = 0;
  const validationResults = cartItems.map((item) => {
    const { quantity } = item;
    const variant = variantMap.get(item.variant_id);

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

  // Early exit on first validation error
  const errorResult = validationResults.find((result) => result?.errors);

  if (errorResult) {
    throw new ValidationError(errorResult?.errors?.message);
  }

  const orderItemsData = validationResults.map((result) => result?.orderItem);

  totalAmount += validationResults.reduce((sum, result) => sum + (result?.subtotal || 0), 0);

  // ✅ VALIDATE ADDRESS BEFORE REDUCING PRODUCT QUANTITIES
  // Handle address - either use existing addressId or create new address
  let address;

  if (addressId) {
    // Use existing address
    address = await AddressModel.findOne({
      where: { id: addressId, created_by: createdBy },
      attributes: [ 'id', 'created_by', 'latitude', 'longitude' ],
      transaction,
    });

    if (!address) {
      throw new ValidationError('Address not found or does not belong to you.');
    }
  } else if (houseNo && streetDetails && city && state && postalCode && name && mobileNumber) {
    // Create new address if address fields are provided
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

    address = await AddressModel.create(convertCamelToSnake(doc), {
      transaction,
    });
  } else {
    // Try to find the most recent address for the user
    address = await AddressModel.findOne({
      where: { created_by: createdBy },
      attributes: [ 'id', 'created_by' ],
      transaction,
      order: [ [ 'created_at', 'DESC' ] ],
    });

    if (!address) {
      throw new ValidationError('Address not found. Please provide address details or addressId.');
    }
  }

  // Discount application variables
  let discountApplied = false;
  let discountType = null;
  let discountId = null;
  let discountPercentage = 0;
  let discountAmount = 0;
  const originalAmount = totalAmount;

  // Offer application
  if (offerCode) {
    const offer = await OfferModel.findOne({
      where: {
        code: offerCode,
        status: 'ACTIVE',
      },
      attributes: [ 'id', 'code', 'percentage', 'min_order_price', 'start_date', 'end_date' ],
      transaction,
    });

    const currentDate = new Date();

    if (offer) {
      if (
        currentDate >= new Date(offer.start_date)
          && currentDate <= new Date(offer.end_date)
      ) {
        if (totalAmount >= offer.min_order_price) {
          discountPercentage = offer.percentage;
          discountAmount = totalAmount * (offer.percentage / 100);
          totalAmount -= discountAmount;
          discountApplied = true;
          discountType = 'OFFER';
          discountId = offer.id;
        } else {
          throw new ValidationError(`Order amount must be atleast ₹${offer.min_order_price} to use this offer`);
        }
      } else {
        throw new ValidationError('This offer is not valid at the moment.');
      }
    } else {
      throw new ValidationError('Invalid offer code.');
    }
  }

  // Promo code application
  if (promocodeId) {
    const promocode = await PromocodeModel.findOne({
      where: {
        id: promocodeId,
        status: 'ACTIVE',
      },
      attributes: [ 'id', 'code', 'percentage', 'start_date', 'end_date', 'branch_id', 'vendor_id' ],
      transaction,
    });

    const currentDate = new Date();

    if (promocode) {
      // Validate date range
      if (
        currentDate >= new Date(promocode.start_date)
          && currentDate <= new Date(promocode.end_date)
      ) {
        // Validate branch if promo code is branch-specific
        if (promocode.branch_id && promocode.branch_id !== branchId) {
          throw new ValidationError('This promo code is not valid for this branch.');
        }

        discountPercentage = promocode.percentage;
        discountAmount = totalAmount * (promocode.percentage / 100);
        totalAmount -= discountAmount;
        discountApplied = true;
        discountType = 'PROMOCODE';
        discountId = promocode.id;
      } else {
        throw new ValidationError('This promo code is not valid at the moment.');
      }
    } else {
      throw new ValidationError('Invalid promo code.');
    }
  }

  // Calculate shipping charges using shipping service (road-distance API with fallback)
  let shippingChargesValue = 0;
  let distance = null;
  let distanceMethod = 'MANUAL';
  let estimatedDeliveryETA = null;

  // Get delivery type from orderPriority (EXPRESS/URGENT = SAME_DAY, NORMAL = NEXT_DAY)
  const deliveryType = (orderPriority === 'EXPRESS' || orderPriority === 'URGENT') ? 'SAME_DAY' : 'NEXT_DAY';

  // Get address coordinates if available
  const addressWithCoords = await AddressModel.findOne({
    where: { id: address.id },
    attributes: [ 'id', 'latitude', 'longitude' ],
    transaction,
  });

  // Get branch coordinates
  const branchWithCoords = await BranchModel.findOne({
    where: { id: branchId },
    attributes: [ 'id', 'latitude', 'longitude' ],
    transaction,
  });

  if (addressWithCoords?.latitude && addressWithCoords?.longitude && branchWithCoords?.latitude && branchWithCoords?.longitude) {
    // Calculate shipping charges using shipping service
    try {
      const shippingResult = await ShippingService.calculateShippingCharges(
        branchId,
        addressWithCoords.latitude,
        addressWithCoords.longitude,
        totalAmount,
        deliveryType,
      );

      if (shippingResult.doc && !shippingResult.errors) {
        shippingChargesValue = shippingResult.doc.shippingCharges || 0;
        distance = shippingResult.doc.distance || null;
        distanceMethod = shippingResult.doc.method || 'MANUAL';
        estimatedDeliveryETA = shippingResult.doc.eta || null;
      } else {
        // Fallback to provided shipping charges or 0
        shippingChargesValue = shippingCharges || 0;
        distanceMethod = 'MANUAL';
      }
    } catch (error) {
      console.error('Error calculating shipping charges:', error);

      // Fallback to provided shipping charges or 0
      shippingChargesValue = shippingCharges || 0;
      distanceMethod = 'MANUAL';
    }
  } else {
    // If coordinates not available, use provided shippingCharges or default to 0
    shippingChargesValue = shippingCharges || 0;
    distanceMethod = 'MANUAL';
  }

  // Calculate final amount: totalAmount - discountAmount + shippingCharges
  const finalAmount = totalAmount - discountAmount + shippingChargesValue;

  // Create order
  const orderConcurrencyStamp = uuidV4();
  const orderNumber = await generateOrderNumber(transaction);

  const orderDoc = {
    totalAmount,
    discountAmount,
    shippingCharges: shippingChargesValue,
    finalAmount,
    addressId: address.id,
    branchId,
    orderNumber,
    orderPriority: orderPriority || 'NORMAL',
    estimatedDeliveryTime: estimatedDeliveryTime || null,
    distance,
    distanceMethod,
    estimatedDeliveryETA,
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

  // Create order items in parallel and reduce quantities
  await Promise.all(orderItemsData.map(async (item) => {
    const itemDoc = {
      concurrencyStamp: uuidV4(),
      orderId: newOrder.id,
      productId: item.product_id,
      variantId: item.variant_id || null,
      variantName: item.variant_name || null,
      quantity: item.quantity,
      priceAtPurchase: item.price_at_purchase,
      createdBy,
    };

    const orderItem = await OrderItemModel.create(convertCamelToSnake(itemDoc), {
      transaction,
    });

    // Reduce variant quantity and create inventory movement
    const quantityRemaining = item.product_quantity - item.quantity;
    const quantityChange = -item.quantity; // Negative for REMOVED

    // Update variant quantity
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

    // Create inventory movement for variant
    await InventoryMovementService.createInventoryMovement({
      productId: item.product_id,
      variantId: item.variant_id,
      vendorId: branchVendorId,
      branchId,
      movementType: 'REMOVED',
      quantityChange,
      quantityBefore: item.product_quantity,
      quantityAfter: quantityRemaining,
      referenceType: 'ORDER',
      referenceId: newOrder.id,
      userId: createdBy,
      notes: `Order ${orderNumber}`,
    });

    return orderItem;
  }));

  // deleting cart
  await CartModel.destroy({
    where: {
      created_by: createdBy,
      status: 'ACTIVE',
    },
    transaction,
  });

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

  const [ response, riderExist ] = await Promise.all([
    OrderModel.findOne({
      where: { id },
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

  if (!response) {
    throw new NotFoundError('Order not found');
  }

  const modifiedData = { ...data };
  const oldStatus = response.status;

  if (riderExist?.role?.name === 'RIDER') {
    modifiedData.riderId = updatedBy;
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  // Recalculate final_amount if discount_amount or shipping_charges are updated
  // Use provided finalAmount if explicitly set, otherwise calculate
  if (finalAmount !== undefined) {
    // Use explicitly provided finalAmount
    modifiedData.finalAmount = finalAmount;
  } else if (discountAmount !== undefined || shippingCharges !== undefined) {
    // Recalculate if discount or shipping charges are updated
    const currentTotal = response.total_amount;
    const newDiscount = discountAmount !== undefined ? discountAmount : response.discount_amount;
    const newShipping = shippingCharges !== undefined ? shippingCharges : response.shipping_charges;

    // final_amount = total_amount - discount_amount + shipping_charges
    modifiedData.finalAmount = currentTotal - newDiscount + newShipping;
  }

  // Track status change if status is being updated
  if (newStatus && newStatus !== oldStatus) {
    const statusHistoryDoc = {
      orderId: id,
      status: newStatus,
      previousStatus: oldStatus,
      changedBy: updatedBy,
      notes: notes || null,
    };

    await OrderStatusHistoryModel.create(convertCamelToSnake(statusHistoryDoc), {
      transaction,
    });

    // Handle order cancellation: restore quantities and create inventory movements
    if (newStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      // Get order items with variants
      const orderItems = await OrderItemModel.findAll({
        where: { order_id: id },
        attributes: [ 'id', 'product_id', 'variant_id', 'variant_name', 'quantity' ],
        transaction,
      });

      // Restore quantities for each order item
      await Promise.all(orderItems.map(async (item) => {
        if (item.variant_id) {
          // Restore variant quantity
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
              vendorId: response.vendor_id || null,
              branchId: response.branch_id || null,
              movementType: 'REVERTED',
              quantityChange,
              quantityBefore,
              quantityAfter,
              referenceType: 'ORDER',
              referenceId: id,
              userId: updatedBy,
              notes: `Order ${response.order_number || id} cancelled`,
            });
          }
        }
      }));
    }
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

  // Create notification for order update (after transaction commit)
  if (newStatus && newStatus !== oldStatus) {
    transaction.afterCommit(async () => {
      try {
        const updatedOrder = await OrderModel.findOne({
          where: { id },
          attributes: [ 'id', 'order_number', 'branch_id', 'created_by' ],
          include: [
            {
              model: BranchModel,
              as: 'branch',
              attributes: [ 'vendor_id' ],
            },
          ],
        });

        if (updatedOrder) {
          await createOrderUpdatedNotification({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.order_number,
            vendorId: updatedOrder.branch?.vendor_id,
            branchId: updatedOrder.branch_id,
            status: newStatus,
            userId: updatedOrder.created_by,
            updatedBy,
          });
        }
      } catch (error) {
        console.error('Error creating order update notification:', error);
      }
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

const getOrderDetails = async (orderId, userId = null) => {
  try {
    const whereClause = { id: orderId };

    // If userId is provided, ensure the order belongs to that user
    if (userId) {
      whereClause.created_by = userId;
    }

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
