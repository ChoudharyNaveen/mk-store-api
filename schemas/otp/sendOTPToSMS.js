const Joi = require('joi');

// India mobile only: +91 followed by 10 digits starting with 6-9
// Example: +919876543210
const PHONE_REGEX = /^\+91[6-9]\d{9}$/;

const sendOTPToSMS = Joi.object({
  mobileNumber: Joi.string()
    .pattern(PHONE_REGEX)
    .required()
    .messages({
      'any.required': 'Parameter: mobileNumber is required in the body.',
      'string.empty': 'Parameter: mobileNumber cannot be empty.',
      'string.pattern.base': 'Parameter: mobileNumber should be in Indian format: +91 followed by a valid 10-digit mobile number.',
    }),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required in the body.',
  }),
}).unknown(false);

module.exports = sendOTPToSMS;
