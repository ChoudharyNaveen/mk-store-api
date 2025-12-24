const Joi = require('joi')

const verifyOtp = Joi.object({
  email: Joi.string().required().messages({
    'any.required': 'Parameter: email is required in the body.',
    'string.empty': 'Parameter: email should be valid.',
  }),
  otp: Joi.string().required().messages({
    'any.required': 'Parameter: otp is required in the body.',
    'string.empty': 'Parameter: otp should be valid.',
  }),
}).unknown(false)

module.exports = verifyOtp
