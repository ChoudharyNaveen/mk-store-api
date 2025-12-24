const { Order: OrderService } = require('../services')

const placeOrder = async (req, res) => {
  try {
    const data = req.validatedData

    const { doc, error } = await OrderService.placeOrder(data)

    if (doc) {
      return res.status(201).json({
        message: 'Order placed successfully',
        data: doc,
      })
    }
    return res.status(400).json({ message: error })
  } catch (error) {
    console.error('Order creation error:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

const getOrder = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await OrderService.getOrder(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const getStatsOfOrdersCompleted = async (req, res) => {
  try {
    const { data } = await OrderService.getStatsOfOrdersCompleted()
    return res.getRequest(data)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const updateOrder = async (req, res) => {
  try {
    const data = req.validatedData

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await OrderService.updateOrder(data)

    if (concurrencyError) {
      return res.concurrencyError()
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc
      res.setHeader('x-concurrencystamp', stamp)
      res.setHeader('message', 'successfully updated.')

      return res.updated()
    }

    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const getTotalReturnsOfToday = async (req, res) => {
  try {
    const { error, data } = await OrderService.getTotalReturnsOfToday()
    if (data) {
      return res.getRequest({ total: data })
    }
    return res.badRequest(error)
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  placeOrder,
  getOrder,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
}
