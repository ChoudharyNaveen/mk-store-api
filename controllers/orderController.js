const { Order: OrderService } = require('../services')
const { handleServerError } = require('../utils/helper')

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
    return handleServerError(error, req, res)
  }
}

const getOrder = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await OrderService.getOrder(data)

    return res.status(200).json({ success: true, doc, count })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

const getStatsOfOrdersCompleted = async (req, res) => {
  try {
    const { data } = await OrderService.getStatsOfOrdersCompleted()
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

const updateOrder = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id }

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await OrderService.updateOrder(data)

    if (concurrencyError) {
      return res.status(409).json({ success: false, message: 'Concurrency error' })
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc
      res.setHeader('x-concurrencystamp', stamp)
      res.setHeader('message', 'successfully updated.')

      return res.status(200).json({ success: true, message: 'successfully updated' })
    }

    return res.status(400).json(err)
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

const getTotalReturnsOfToday = async (req, res) => {
  try {
    const { error, data } = await OrderService.getTotalReturnsOfToday()
    if (data) {
      return res.status(200).json({ success: true, total: data })
    }
    return res.status(400).json({ success: false, error })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

module.exports = {
  placeOrder,
  getOrder,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
}
