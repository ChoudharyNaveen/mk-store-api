const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updatePromocode = Joi.object({
  publicId: Joi.string().required(),
  type: Joi.string().optional(),
  code: Joi.string().optional(),
  description: Joi.string().optional(),
  percentage: Joi.number().integer().optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.string().pattern(uuidPattern).required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updatePromocode
