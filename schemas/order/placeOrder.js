const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const placeOrder = Joi.object({
  addressId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: addressId is required',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  promocodeId: Joi.number().integer().optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false)

module.exports = placeOrder
