const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updateBranch = Joi.object({
  publicId: Joi.string().pattern(uuidPattern).required(),
  vendorId: Joi.string().pattern(uuidPattern).optional(),
  name: Joi.string().optional(),
  address: Joi.string().optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.string().pattern(uuidPattern).required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updateBranch
