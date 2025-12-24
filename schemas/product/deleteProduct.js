const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const deleteProduct = Joi.object({
  productId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: productId is required in query',
    'string.pattern.base': 'Parameter: productId should be a valid UUID',
  }),
}).unknown(false)

module.exports = deleteProduct
