const Joi = require('joi');

const filterSchema = Joi.object({
  key: Joi.string().required(),
  in: Joi.array().items(Joi.string()).optional(),
  eq: Joi.string().optional(),
  neq: Joi.string().optional(),
  gt: Joi.string().optional(),
  gte: Joi.string().optional(),
  lt: Joi.string().optional(),
  lte: Joi.string().optional(),
  like: Joi.string().optional(),
  iLike: Joi.string().optional(),
}).or('in', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'iLike');

const sortingSchema = Joi.object({
  key: Joi.string().required(),
  direction: Joi.string().valid('ASC', 'DESC').required(),
});

const getProductVariants = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required',
  }),
  variantType: Joi.string().valid('WEIGHT', 'SIZE', 'COLOR', 'MATERIAL', 'FLAVOR', 'PACKAGING', 'OTHER').optional(),
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
  filters: Joi.array().items(filterSchema).optional(),
  sorting: Joi.array().items(sortingSchema).optional(),
}).unknown(false);

module.exports = getProductVariants;
