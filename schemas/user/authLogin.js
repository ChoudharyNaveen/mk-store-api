const Joi = require('joi')

const authLogin = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': 'Parameter: email is required in the body',
    'string.email': 'Parameter: email should be a valid email address',
    'string.empty': 'Parameter: email is required in the body',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Parameter: password is required in the body',
    'string.empty': 'Parameter: password is required in the body',
  }),
}).unknown(false)

module.exports = authLogin

