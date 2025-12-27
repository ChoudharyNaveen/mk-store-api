const Joi = require('joi');

const updateUserProfile = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().min(1).required().messages({
    'any.required': 'Parameter: name is required to complete profile',
    'string.empty': 'Parameter: name is required to complete profile',
    'string.min': 'Parameter: name is required to complete profile',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Parameter: email is required to complete profile',
    'string.email': 'Parameter: email should be a valid email address',
    'string.empty': 'Parameter: email is required to complete profile',
  }),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateUserProfile;
