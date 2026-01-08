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

const getNotification = Joi.object({
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
  recipientId: Joi.number().integer().optional(),
  recipientType: Joi.string().valid('USER', 'VENDOR_ADMIN', 'SUPERADMIN', 'ALL').optional(),
  vendorId: Joi.number().integer().optional(),
  branchId: Joi.number().integer().optional(),
}).unknown(false);

module.exports = getNotification;
