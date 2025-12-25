const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updateVendor = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  mobile_number: Joi.string().optional(),
  address: Joi.string().optional().allow(''),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updateVendor
