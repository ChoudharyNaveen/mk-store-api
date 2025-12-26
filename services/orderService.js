const { v4: uuidV4 } = require('uuid');
const {
  Op, fn, col,
} = require('sequelize');
const {
  order: OrderModel,
  cart: CartModel,
  product: ProductModel,
  orderItem: OrderItemModel,
  address: AddressModel,
  user: UserModel,
  offer: OfferModel,
  role: RoleModel,
  branch: BranchModel,
  sequelize,
} = require('../database');
const Helper = require('../utils/helper');

const placeOrder = async (data) => {
  let transaction = null;

  try {
    const {
      createdBy,
      branchId,
      houseNo,
      streetDetails,
      landmark,
      name,
      mobileNumber,
      offerCode,
    } = data;

    transaction = await sequelize.transaction();

    // Verify branch exists
    if (!branchId) {
      await transaction.rollback();

      return { error: 'branchId is required' };
    }

    const branch = await BranchModel.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      await transaction.rollback();

      return { error: 'Branch not found' };
    }

    const cartItems = await CartModel.findAll({
      where: {
        created_by: createdBy,
        status: 'ACTIVE',
      },
      include: [
        {
          model: ProductModel,
          as: 'productDetails',
        },
      ],
    });

    if (cartItems.length === 0) {
      await transaction.rollback();

      return { error: 'no item in the cart' };
    }

    // calculate total amount
    let totalAmount = 0;
    const orderItemsData = [];

    const productUpdateResults = await Promise.all(cartItems.map(async (item) => {
      const price = item.productDetails.selling_price;
      const { quantity } = item;
      const subtotal = price * quantity;

      totalAmount += subtotal;

      const product = await ProductModel.findOne({
        where: { id: item.product_id },
        transaction,
      });

      if (!product) {
        return {
          error: `Product with id ${item.product_id} not found`,
        };
      }

      if (quantity > product.dataValues.quantity) {
        return {
          error: `we apologize for the inconvinence, quantity for the ${product.dataValues.title} is left with only ${product.dataValues.quantity}. 
          please try with lower quantity`,
        };
      }

      const productQuanityRemaining = product.dataValues.quantity - quantity;

      await ProductModel.update(
        { quantity: productQuanityRemaining, concurrency_stamp: uuidV4() },
        {
          where: { id: product.id },
          transaction,
        },
      );

      orderItemsData.push({
        product_id: item.product_id,
        quantity,
        price_at_purchase: price,
      });

      return { success: true, message: 'Product quantity updated successfully' };
    }));

    // Check for errors in product updates
    const errorResult = productUpdateResults.find((result) => result?.error);

    if (errorResult) {
      await transaction.rollback();

      return errorResult;
    }

    // offer application
    if (offerCode) {
      const offer = await OfferModel.findOne({
        where: {
          code: offerCode,
          status: 'ACTIVE',
        },
        transaction,
      });

      const currentDate = new Date();

      if (offer) {
        if (
          currentDate >= new Date(offer.dataValues.start_date)
          && currentDate <= new Date(offer.dataValues.end_date)
        ) {
          if (totalAmount >= offer.dataValues.min_order_price) {
            const discount = totalAmount * (offer.dataValues.percentage / 100);

            totalAmount -= discount;
          } else {
            await transaction.rollback();

            return {
              error: `Order amount must be atleast ₹${offer.dataValues.min_order_price} to use this offer`,
            };
          }
        } else {
          await transaction.rollback();

          return { error: 'This offer is not valid at the moment.' };
        }
      } else {
        await transaction.rollback();

        return { error: 'Invalid offer code.' };
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

      await AddressModel.create(Helper.convertCamelToSnake(doc), {
        transaction,
      });
    }

    const address = await AddressModel.findOne({
      where: { created_by: createdBy },
      transaction,
      order: [ [ 'created_at', 'DESC' ] ],
    });

    if (!address) {
      await transaction.rollback();

      return { error: 'Address not found. Please provide address details.' };
    }

    // create order
    const orderConcurrencyStamp = uuidV4();

    const orderDoc = {
      totalAmount,
      addressId: address.id,
      branchId,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      concurrencyStamp: orderConcurrencyStamp,
      createdBy,
    };

    const newOrder = await OrderModel.create(
      Helper.convertCamelToSnake(orderDoc),
      {
        transaction,
      },
    );

    // create order item
    await Promise.all(orderItemsData.map(async (item) => {
      const itemDoc = {
        concurrencyStamp: uuidV4(),
        orderId: newOrder.id,
        productId: item.product_id,
        quantity: item.quantity,
        priceAtPurchase: item.price_at_purchase,
        createdBy,
      };

      await OrderItemModel.create(Helper.convertCamelToSnake(itemDoc), {
        transaction,
      });
    }));

    // deleting cart
    if (newOrder) {
      await CartModel.destroy({
        where: {
          created_by: createdBy,
          status: 'ACTIVE',
        },
        transaction,
      });
    }

    await transaction.commit();

    return {
      doc: {
        order_id: newOrder.id,
        total_amount: newOrder.total_amount,
        item_count: orderItemsData.length,
      },
    };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return { error };
  }
};

const getOrder = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = Helper.calculatePagination(pageSize, pageNumber);

  const where = Helper.generateWhereCondition(filters);
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await OrderModel.findAndCountAll({
    where: { ...where },
    include: [
      {
        model: AddressModel,
        as: 'address',
      },
      {
        model: UserModel,
        as: 'user',
      },
    ],
    order,
    limit,
    offset,
  });
  const doc = [];

  if (response) {
    const { count, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, doc };
  }

  return { count: 0, doc: [] };
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

const updateOrder = async (data) => {
  let transaction = null;
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  try {
    transaction = await sequelize.transaction();
    const response = await OrderModel.findOne({
      where: { id },
      transaction,
    });

    if (response) {
      const riderExist = await UserModel.findOne({
        where: { id: updatedBy },
        include: [
          {
            model: RoleModel, as: 'role',
          },
        ],
        transaction,
      });
      const modifiedData = { ...data };

      if (riderExist?.dataValues?.role?.dataValues?.name === 'RIDER') {
        modifiedData.riderId = updatedBy;
      }
      const { concurrency_stamp: stamp } = response;

      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4();
        const doc = {
          ...Helper.convertCamelToSnake(modifiedData),
          updatedBy,
          concurrency_stamp: newConcurrencyStamp,
        };

        await OrderModel.update(doc, {
          where: { id },
          transaction,
        });
        await transaction.commit();

        return { doc: { concurrencyStamp: newConcurrencyStamp } };
      }
      await transaction.rollback();

      return { concurrencyError: { message: 'invalid concurrency stamp' } };
    }

    return {};
  } catch (error) {
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }

    return { errors: { message: 'transaction failed' } };
  }
};

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
