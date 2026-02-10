const Joi = require('joi');

const getLowStockProducts = Joi.object({
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
  vendorId: Joi.number().integer().optional(),
  branchId: Joi.number().integer().optional(),
  dateFrom: Joi.date().optional()
    .description('Start of date range for updated_at (optional)'),
  dateTo: Joi.date().optional()
    .description('End of date range for updated_at (optional)'),
}).unknown(false);

module.exports = getLowStockProducts;

