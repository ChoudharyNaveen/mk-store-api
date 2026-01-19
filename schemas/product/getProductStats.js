const Joi = require('joi');

const getProductStats = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required',
    'number.base': 'Parameter: productId must be a number',
  }),
}).unknown(false);

module.exports = getProductStats;
