const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const deleteCart = Joi.object({
  cartId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: cartId is required in query',
    'string.pattern.base': 'Parameter: cartId should be a valid UUID',
  }),
}).unknown(false)

module.exports = deleteCart
