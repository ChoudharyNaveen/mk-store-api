const { v4: uuidV4 } = require('uuid');
const { fn, col } = require('sequelize');
const {
  order: OrderModel,
  cart: CartModel,
  product: ProductModel,
  orderItem: OrderItemModel,
  address: AddressModel,
  user: UserModel,
  offer: OfferModel,
  promocode: PromocodeModel,
  role: RoleModel,
  branch: BranchModel,
  orderDiscount: OrderDiscountModel,
  orderStatusHistory: OrderStatusHistoryModel,
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
    houseNo,
    streetDetails,
    landmark,
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
    return { error: 'branchId is required' };
  }

  if (!vendorId) {
    return { error: 'vendorId is required' };
  }

  // Validate that only one discount type is provided
  if (offerCode && promocodeId) {
    return { error: 'Cannot apply both offer code and promo code. Please choose one.' };
  }

  const branch = await BranchModel.findOne({
    where: { id: branchId, vendor_id: vendorId },
    attributes: [ 'id', 'vendor_id' ],
    transaction,
  });

  if (!branch) {
    return { error: 'Branch not found or does not belong to the specified vendor' };
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
    attributes: [ 'id', 'product_id', 'vendor_id', 'branch_id', 'quantity', 'created_by' ],
    include: [
      {
        model: ProductModel,
        as: 'productDetails',
        attributes: [ 'id', 'title', 'selling_price', 'quantity', 'concurrency_stamp' ],
      },
    ],
    transaction,
  });

  if (cartItems.length === 0) {
    return { error: 'no item in the cart' };
  }

  // Fetch all products in parallel for validation and quantity checks
  const productIds = cartItems.map((item) => item.product_id);
  const products = await ProductModel.findAll({
    where: { id: { [Op.in]: productIds } },
    attributes: [ 'id', 'title', 'quantity', 'concurrency_stamp' ],
    transaction,
  });

  const productMap = new Map(products.map((p) => [ p.id, p ]));

  // calculate total amount and validate quantities
  let totalAmount = 0;
  const validationResults = cartItems.map((item) => {
    const price = item.productDetails.selling_price;
    const { quantity } = item;
    const subtotal = price * quantity;
    const product = productMap.get(item.product_id);

    if (!product) {
      return {
        error: `Product with id ${item.product_id} not found`,
      };
    }

    if (quantity > product.quantity) {
      return {
        error: `we apologize for the inconvenience, quantity for the ${product.title} is left with only ${product.quantity}.
          please try with lower quantity`,
      };
    }

    return {
      orderItem: {
        product_id: item.product_id,
        quantity,
        price_at_purchase: price,
        product_quantity: product.quantity,
        product_concurrency_stamp: product.concurrency_stamp,
      },
      subtotal,
    };
  });

  // Early exit on first validation error
  const errorResult = validationResults.find((result) => result?.error);

  if (errorResult) {
    return { error: errorResult.error };
  }

  const orderItemsData = validationResults.map((result) => result?.orderItem);

  totalAmount += validationResults.reduce((sum, result) => sum + (result?.subtotal || 0), 0);

  // Update all product quantities in parallel
  await Promise.all(orderItemsData.map(async (itemData) => {
    const productQuanityRemaining = itemData.product_quantity - itemData.quantity;

    await ProductModel.update(
      { quantity: productQuanityRemaining, concurrency_stamp: uuidV4() },
      {
        where: { id: itemData.product_id },
        transaction,
      },
    );
  }));

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
          return {
            error: `Order amount must be atleast ₹${offer.min_order_price} to use this offer`,
          };
        }
      } else {
        return { error: 'This offer is not valid at the moment.' };
      }
    } else {
      return { error: 'Invalid offer code.' };
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
          return { error: 'This promo code is not valid for this branch.' };
        }

        discountPercentage = promocode.percentage;
        discountAmount = totalAmount * (promocode.percentage / 100);
        totalAmount -= discountAmount;
        discountApplied = true;
        discountType = 'PROMOCODE';
        discountId = promocode.id;
      } else {
        return { error: 'This promo code is not valid at the moment.' };
      }
    } else {
      return { error: 'Invalid promo code.' };
    }
  }

  // create address
  if (houseNo && streetDetails && landmark && name && mobileNumber) {
    const addressConcurrencyStamp = uuidV4();

    const doc = {
      concurrencyStamp: addressConcurrencyStamp,
      houseNo,
      streetDetails,
      landmark,
      name,
      mobileNumber,
      createdBy,
    };

    await AddressModel.create(convertCamelToSnake(doc), {
      transaction,
    });
  }

  const address = await AddressModel.findOne({
    where: { created_by: createdBy },
    attributes: [ 'id', 'created_by' ],
    transaction,
    order: [ [ 'created_at', 'DESC' ] ],
  });

  if (!address) {
    return { error: 'Address not found. Please provide address details.' };
  }

  // Calculate shipping charges (default to 0 if not provided)
  const shippingChargesValue = shippingCharges || 0;

  // Calculate final amount: totalAmount - discountAmount + shippingCharges
  const finalAmount = totalAmount - discountAmount + shippingChargesValue;

  // create order
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
    refundAmount: 0,
    refundStatus: 'NONE',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    concurrencyStamp: orderConcurrencyStamp,
    createdBy,
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

  // create order items in parallel
  await Promise.all(orderItemsData.map(async (item) => {
    const itemDoc = {
      concurrencyStamp: uuidV4(),
      orderId: newOrder.id,
      productId: item.product_id,
      quantity: item.quantity,
      priceAtPurchase: item.price_at_purchase,
      createdBy,
    };

    await OrderItemModel.create(convertCamelToSnake(itemDoc), {
      transaction,
    });
  }));

  // deleting cart
  await CartModel.destroy({
    where: {
      created_by: createdBy,
      status: 'ACTIVE',
    },
    transaction,
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
      item_count: orderItemsData.length,
    },
  };
}).catch((error) => {
  console.log(error);

  return { error };
});

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
          model: AddressModel,
          as: 'address',
          attributes: [ 'id', 'house_no', 'street_details', 'landmark', 'name', 'mobile_number' ],
        },
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'email', 'mobile_number' ],
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
              attributes: [ 'id', 'code', 'description' ],
              required: false,
            },
            {
              model: PromocodeModel,
              as: 'promocode',
              attributes: [ 'id', 'code', 'description' ],
              required: false,
            },
          ],
          required: false,
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
    console.error('Error in getStatsOfOrdersCompleted:', error);

    return { error: 'Internal server error' };
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
        'concurrency_stamp',
        'status',
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
    return { errors: { message: 'Order not found' } };
  }

  const modifiedData = { ...data };
  const oldStatus = response.status;

  if (riderExist?.role?.name === 'RIDER') {
    modifiedData.riderId = updatedBy;
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    return { concurrencyError: { message: 'invalid concurrency stamp' } };
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

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

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
    return { error: 'failed to fetch returns' };
  }
};

module.exports = {
  placeOrder,
  getOrder,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
};
