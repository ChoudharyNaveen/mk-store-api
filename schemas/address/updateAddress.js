const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updateAddress = Joi.object({
  publicId: Joi.string().required(),
  house_no: Joi.string().optional(),
  streetDetails: Joi.string().optional(),
  landmark: Joi.string().optional(),
  name: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.string().pattern(uuidPattern).required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updateAddress
