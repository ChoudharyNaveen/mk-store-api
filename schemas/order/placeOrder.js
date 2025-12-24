const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const placeOrder = Joi.object({
  addressId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: addressId is required',
    'string.pattern.base': 'Parameter: addressId should be a valid UUID',
  }),
  branchId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: branchId is required',
    'string.pattern.base': 'Parameter: branchId should be a valid UUID',
  }),
  promocodeId: Joi.string().pattern(uuidPattern).optional().messages({
    'string.pattern.base': 'Parameter: promocodeId should be a valid UUID',
  }),
  createdBy: Joi.string().pattern(uuidPattern).optional(),
}).unknown(false)

module.exports = placeOrder
