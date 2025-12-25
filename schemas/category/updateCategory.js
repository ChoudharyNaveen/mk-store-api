const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updateCategory = Joi.object({
  id: Joi.number().integer().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  branchId: Joi.number().integer().optional(),
  vendorId: Joi.number().integer().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updateCategory
