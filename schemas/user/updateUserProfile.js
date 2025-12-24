const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updateUserProfile = Joi.object({
  publicId: Joi.string().pattern(uuidPattern).required(),
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
  updatedBy: Joi.string().pattern(uuidPattern).required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updateUserProfile
