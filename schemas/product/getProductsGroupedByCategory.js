const Joi = require('joi');

const getProductsGroupedByCategory = Joi.object({
  pageSize: Joi.number().integer().valid(1, 5, 10, 20, 30, 40, 50, 100, 500).optional()
    .default(10)
    .messages({
      'any.only': 'Parameter: pageSize should be valid.',
    }),
  pageNumber: Joi.number().integer().min(1).optional()
    .default(1)
    .messages({
      'number.min': 'Parameter: pageNumber should be valid.',
    }),
}).unknown(false);

module.exports = getProductsGroupedByCategory;
