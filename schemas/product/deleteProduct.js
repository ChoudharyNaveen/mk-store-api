const Joi = require('joi');

const deleteProduct = Joi.object({
  productIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
    .messages({
      'any.required': 'Parameter: productIds is required in body',
      'array.base': 'Parameter: productIds must be an array',
      'array.min': 'Parameter: productIds must contain at least one product id',
    }),
}).messages({
  'object.unknown': 'Only productIds is allowed in body',
}).unknown(false);

module.exports = deleteProduct;
