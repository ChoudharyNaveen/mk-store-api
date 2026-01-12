const Joi = require('joi');

const checkServiceability = Joi.object({
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  latitude: Joi.number().required().messages({
    'any.required': 'Parameter: latitude is required',
    'number.base': 'Parameter: latitude must be a number',
  }),
  longitude: Joi.number().required().messages({
    'any.required': 'Parameter: longitude is required',
    'number.base': 'Parameter: longitude must be a number',
  }),
  maxDistance: Joi.number().min(0).optional().default(10)
    .messages({
      'number.min': 'Parameter: maxDistance must be greater than or equal to 0',
    }),
}).unknown(false);

module.exports = checkServiceability;
