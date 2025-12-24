const Joi = require('joi')

const sendOTPToMail = Joi.object({
  userEmail: Joi.string().email().required().messages({
    'any.required': 'Parameter: userEmail is required in the body.',
    'string.email': 'Parameter: userEmail should be a valid email address.',
    'string.empty': 'Parameter: userEmail is required in the body.',
  }),
}).unknown(false)

module.exports = sendOTPToMail
