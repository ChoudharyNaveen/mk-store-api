const Joi = require('joi');

const updateProductType = Joi.object({
  title: Joi.string().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required().messages({
    'any.required': 'Parameter: updatedBy is required',
  }),
  concurrencyStamp: Joi.string().required().messages({
    'any.required': 'Parameter: concurrencyStamp is required',
  }),
}).unknown(false);

module.exports = updateProductType;
