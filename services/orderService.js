const {
  order: OrderModel,
  cart: CartModel,
  product: ProductModel,
  orderItem: OrderItemModel,
  address: AddressModel,
  user: UserModel,
  offer: OfferModel,
  role:RoleModel,
  sequelize,
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')
const { Op, fn, col, literal } = require('sequelize')

const placeOrder = async (data) => {
  let transaction = null

  try {
    const {
      createdBy,
      houseNo,
      streetDetails,
      landmark,
      name,
      mobileNumber,
      offerCode,
      ...datas
    } = data
    transaction = await sequelize.transaction()

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
    })

    if (cartItems.length === 0) {
      return { error: 'no item in the cart' }
    }

    //calculate total amount
    let totalAmount = 0
    const orderItemsData = []

    for (const item of cartItems) {
      const price = item.productDetails.selling_price
      const quantity = item.quantity
      const subtotal = price * quantity
      totalAmount += subtotal

      const product = await ProductModel.findOne({
        where: { public_id: item.product_id },
      })

      if (quantity > product.dataValues.quantity) {
        return {
          error: `we apologize for the inconvinence, quantity for the ${product.dataValues.title} is left with only ${product.dataValues.quantity}. please try with lower quantity`,
        }
      }

      const productQuanityRemaining = product.dataValues.quantity - quantity

      await ProductModel.update(
        { quantity: productQuanityRemaining, concurrency_stamp: uuidV4() },
        {
          where: { public_id: product.dataValues.public_id },
          transaction,
        }
      )

      orderItemsData.push({
        public_id: uuidV4(),
        concurrency_stamp: uuidV4(),
        product_id: item.product_id,
        quantity,
        price_at_purchase: price,
      })
    }

    //offer application
    if (offerCode) {
      const offer = await OfferModel.findOne({
        where: {
          code: offerCode,
          status: 'ACTIVE',
        },
      })

      const currentDate = new Date()

      if (offer) {
        if (
          currentDate >= new Date(offer.dataValues.start_date) &&
          currentDate <= new Date(offer.dataValues.end_date)
        ) {
          if (totalAmount >= offer.dataValues.min_order_price) {
            const discount = totalAmount * (offer.dataValues.percentage / 100)
            totalAmount = totalAmount - discount
          } else {
            return {
              error: `Order amount must be atleast ₹${offer.dataValues.min_order_price} to use this offer`,
            }
          }
        } else {
          return { error: 'This offer is not valid at the moment.' }
        }
      } else {
        return { error: 'Invalid offer code.' }
      }
    }

    //create address
    if (houseNo && streetDetails && landmark && name && mobileNumber) {
      const addressPublicId = uuidV4()
      const addressConcurrencyStamp = uuidV4()

      const doc = {
        publicId: addressPublicId,
        concurrencyStamp: addressConcurrencyStamp,
        houseNo,
        streetDetails,
        landmark,
        name,
        mobileNumber,
        createdBy,
      }

      await AddressModel.create(Helper.convertCamelToSnake(doc), {
        transaction,
      })
    }

    const address = await AddressModel.findOne({
      where: { created_by: createdBy },
      transaction,
    })

    //create 0rder
    const orderPublicId = uuidV4()
    const orderConcurrencyStamp = uuidV4()

    const orderDoc = {
      publicId: orderPublicId,
      totalAmount: totalAmount,
      addressId: address.dataValues.public_id,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      concurrencyStamp: orderConcurrencyStamp,
      createdBy: createdBy,
    }

    const newOrder = await OrderModel.create(
      Helper.convertCamelToSnake(orderDoc),
      {
        transaction,
      }
    )

    //create order item
    for (const item of orderItemsData) {
      const itemDoc = {
        publicId: uuidV4(),
        concurrencyStamp: uuidV4(),
        orderId: orderPublicId,
        productId: item.product_id,
        quantity: item.quantity,
        priceAtPurchase: item.price_at_purchase,
        createdBy: createdBy,
      }

      await OrderItemModel.create(Helper.convertCamelToSnake(itemDoc), {
        transaction,
      })
    }

    //deleting cart
    if (newOrder) {
      await CartModel.destroy({
        where: {
          created_by: createdBy,
          status: 'ACTIVE',
        },
        transaction,
      })
    }

    await transaction.commit()
    return {
      doc: {
        order_id: newOrder.public_id,
        total_amount: newOrder.total_amount,
        item_count: orderItemsData.length,
      },
    }
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    return { error: error }
  }
}

const getOrder = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

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
  })
  const doc = []
  if (response) {
    const { count, rows } = response
    rows.map((element) => doc.push(element.dataValues))
    return { count, doc }
  }
  return { count: 0, doc: [] }
}

const getStatsOfOrdersCompleted = async () => {
  try {
    const result = await OrderModel.findAll({
      attributes: [
        [fn('MONTH', col('created_at')), 'month'],
        [fn('SUM', col('total_amount')), 'total'],
      ],
      where: {
        status: 'DELIVERED',
        payment_status: 'PAID',
      },
      group: [fn('MONTH', col('created_at'))],
      raw: true,
    })

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
    }

    const fullStats = Object.entries(monthMap).map(([num, name]) => {
      const found = result.find((r) => parseInt(r.month) === parseInt(num))
      return {
        month: name,
        totalAmount: found ? parseFloat(found.total).toFixed(2) : '0.00',
      }
    })

    return { data: fullStats }
  } catch (error) {
    console.error('Error in getStatsOfOrdersCompleted:', error)
    return { error: 'Internal server error' }
  }
}

const updateOrder = async (data) => {
  let transaction = null
  const { publicId, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await OrderModel.findOne({
      where: { public_id: publicId },
    })

    if (response) {
      const riderExist = await UserModel.findOne({
        where: {public_id: updatedBy},
        include:[
          {
            model:RoleModel, as: 'role'
          }
        ]
      })

      if (riderExist?.dataValues?.role?.dataValues?.name ==='rider') {
        data.riderId = updatedBy
      }
      const { concurrency_stamp: stamp } = response
      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4()
        const doc = {
          ...Helper.convertCamelToSnake(data),
          updatedBy,
          concurrency_stamp: newConcurrencyStamp,
        }

        await OrderModel.update(doc, {
          where: { public_id: publicId },
          transaction,
        })
        await transaction.commit()
        return { doc: { concurrencyStamp: newConcurrencyStamp } }
      }
      await transaction.rollback()
      return { concurrencyError: { message: 'invalid concurrency stamp' } }
    }
    return {}
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'transaction failed' } }
  }
}

const getTotalReturnsOfToday = async () => {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const result = await OrderModel.findAll({
      attributes: [[fn('SUM', col('total_amount')), 'total']],
      where: {
        status: 'DELIVERED',
        payment_status: 'PAID',
        created_at: { [Op.between]: [todayStart, todayEnd] },
      },
      raw: true
    })
    const total = result[0].total || 0
    return { data: parseFloat(total).toFixed(2) }
  } catch (error) {
    return { error: 'failed to fetch returns' }
  }
}

module.exports = {
  placeOrder,
  getOrder,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
}
