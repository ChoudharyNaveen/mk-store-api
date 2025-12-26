const Joi = require('joi');

const userLogin = Joi.object({
  email: Joi.string().optional().allow(''),
  mobile_number: Joi.string().optional().allow(''),
  password: Joi.string().required().messages({
    'any.required': 'Parameter: password is required in the body',
    'string.empty': 'Parameter: password is required in the body',
  }),
}).unknown(false);

module.exports = userLogin;
