const { OrderItem: OrderItemService } = require('../services')
const { handleServerError } = require('../utils/helper')

const getOrderItem = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await OrderItemService.getOrderItem(data)

    return res.status(200).json({ success: true, doc, count })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

module.exports = {
  getOrderItem,
}
