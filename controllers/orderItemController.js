const { OrderItem: OrderItemService } = require('../services')
const {
  getOrderItem: getOrderItemSchema,
} = require('../schemas')
const Validator = require('../utils/validator')

const getOrderItem = async (req, res) => {
  try {
    const {
      query: {
        pageSize: pageSizeString,
        pageNumber: pageNumberString,
        ...query
      },
    } = req

    const pageNumber = parseInt(pageNumberString || 1)
    const pageSize = parseInt(pageSizeString || 10)

    const data = {
      ...query,
      pageNumber,
      pageSize,
    }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: getOrderItemSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await OrderItemService.getOrderItem(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  getOrderItem,
}
