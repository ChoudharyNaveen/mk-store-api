const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const sendOTPToSMS = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^\+[1-9]\d{8,13}$/)
    .min(10)
    .max(15)
    .required()
    .messages({
      'any.required': 'Parameter: mobileNumber is required in the body.',
      'string.empty': 'Parameter: mobileNumber cannot be empty and should be in E.164 format (e.g., +1234567890).',
      'string.pattern.base': 'Parameter: mobileNumber should be in E.164 format starting with + followed by country code and number (e.g., +1234567890).',
      'string.min': 'Parameter: mobileNumber must be at least 10 characters long (e.g., +1234567890).',
      'string.max': 'Parameter: mobileNumber must not exceed 15 characters (E.164 standard).',
    }),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required in the body.',
  }),
}).unknown(false)

module.exports = sendOTPToSMS
