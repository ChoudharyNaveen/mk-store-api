const Joi = require('joi');

const convertUserToRider = Joi.object({
  userId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: userId is required',
    'number.base': 'Parameter: userId must be a number',
  }),
  targetRole: Joi.string().valid('RIDER', 'USER').required().messages({
    'any.required': 'Parameter: targetRole is required',
    'any.only': 'Parameter: targetRole must be RIDER or USER',
  }),
}).unknown(false);

module.exports = convertUserToRider;
