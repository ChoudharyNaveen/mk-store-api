const Joi = require('joi');

const getOrder = Joi.object({
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
  filters: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      eq: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      in: Joi.array().optional(),
      neq: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      gt: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      gte: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      lt: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      lte: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      like: Joi.string().optional(),
      iLike: Joi.string().optional(),
    }),
  ).optional(),
  sorting: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      direction: Joi.string().valid('ASC', 'DESC').required(),
    }),
  ).optional(),
}).unknown(false);

module.exports = getOrder;
