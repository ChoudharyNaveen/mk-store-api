const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const saveCart = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': 'Parameter: productId is requried',
    'string.empty': 'Parameter: productId is requried',
  }),
  quantity: Joi.number().integer().required().messages({
    'any.required': 'Parameter: quantity is required',
    'number.base': 'Parameter: quantity is required',
  }),
  createdBy: Joi.string().pattern(uuidPattern).optional(),
}).unknown(false)

module.exports = saveCart
