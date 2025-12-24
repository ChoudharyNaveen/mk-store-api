const { OrderItem: OrderItemService } = require('../services')

const getOrderItem = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await OrderItemService.getOrderItem(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  getOrderItem,
}
