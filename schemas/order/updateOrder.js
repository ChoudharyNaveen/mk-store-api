const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updateOrder = Joi.object({
  publicId: Joi.string().pattern(uuidPattern).required(),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED').optional(),
  updatedBy: Joi.string().pattern(uuidPattern).required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updateOrder
