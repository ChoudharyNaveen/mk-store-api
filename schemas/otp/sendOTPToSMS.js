const Joi = require('joi');

// Accept either:
// - E.164: +[country][number], 8–15 digits after + (e.g., +14155552671)
// - Local 10‑digit mobile starting with 6–9 (e.g., 9876543210)
const PHONE_REGEX = /^(?:\+[1-9]\d{7,14}|[6-9]\d{9})$/;

const sendOTPToSMS = Joi.object({
  mobileNumber: Joi.string()
    .pattern(PHONE_REGEX)
    .required()
    .messages({
      'any.required': 'Parameter: mobileNumber is required in the body.',
      'string.empty': 'Parameter: mobileNumber cannot be empty.',
      'string.pattern.base': 'Parameter: mobileNumber should be a valid phone number in E.164 format (e.g., +14155552671) or a 10-digit mobile starting with 6–9 (e.g., 9876543210).',
    }),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required in the body.',
  }),
}).unknown(false);

module.exports = sendOTPToSMS;
