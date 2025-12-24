const Joi = require('joi')

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
}).or('in', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'iLike')

const sortingSchema = Joi.object({
  key: Joi.string().required(),
  direction: Joi.string().valid('ASC', 'DESC').required(),
})

const getProduct = Joi.object({
  pageSize: Joi.number().integer().valid(10, 20, 30, 40, 50, 100, 500).required().messages({
    'any.required': 'Parameter: pageSize is required in the body.',
    'any.only': 'Parameter: pageSize should be valid.',
  }),
  pageNumber: Joi.number().integer().min(1).required().messages({
    'any.required': 'Parameter: pageNumber is required in the body.',
    'number.min': 'Parameter: pageNumber should be valid.',
  }),
  filters: Joi.array().items(filterSchema).optional(),
  sorting: Joi.array().items(sortingSchema).optional(),
}).unknown(false)

module.exports = getProduct
