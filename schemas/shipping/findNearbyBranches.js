const Joi = require('joi');

const findNearbyBranches = Joi.object({
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
  vendorId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: vendorId must be a number',
  }),
}).unknown(false);

module.exports = findNearbyBranches;
