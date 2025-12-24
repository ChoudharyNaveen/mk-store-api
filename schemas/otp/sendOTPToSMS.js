const Joi = require('joi')

const sendOTPToSMS = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .min(1)
    .required()
    .messages({
      'any.required': 'Parameter: mobileNumber is required in the body.',
      'string.empty': 'Parameter: mobileNumber cannot be empty and should be in E.164 format (e.g., +1234567890).',
      'string.pattern.base': 'Parameter: mobileNumber cannot be empty and should be in E.164 format (e.g., +1234567890).',
    }),
}).unknown(false)

module.exports = sendOTPToSMS
