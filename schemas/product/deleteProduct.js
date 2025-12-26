const Joi = require('joi');

const deleteProduct = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required in query',
  }),
}).unknown(false);

module.exports = deleteProduct;
