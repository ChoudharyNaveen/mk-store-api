const Joi = require('joi');

const updatePromocode = Joi.object({
  id: Joi.number().integer().required(),
  type: Joi.string().optional(),
  code: Joi.string().optional(),
  description: Joi.string().optional(),
  percentage: Joi.number().integer().optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updatePromocode;
