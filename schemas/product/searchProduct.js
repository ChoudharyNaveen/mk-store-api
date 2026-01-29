const Joi = require('joi');

const searchProduct = Joi.object({
  searchQuery: Joi.string().required().min(1).max(200)
    .trim()
    .messages({
      'any.required': 'Parameter: searchQuery is required',
      'string.empty': 'Parameter: searchQuery is required',
      'string.max': 'Parameter: searchQuery must be at most 200 characters',
    }),
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
  branchId: Joi.number().integer().required(),
  vendorId: Joi.number().integer().required(),
  categoryId: Joi.number().integer().optional(),
  subCategoryId: Joi.number().integer().optional(),
}).unknown(false);

module.exports = searchProduct;
