const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const deleteProduct = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required in query',
  }),
}).unknown(false)

module.exports = deleteProduct
