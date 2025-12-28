const Joi = require('joi');

const refreshToken = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Parameter: token is required in the body',
    'string.empty': 'Parameter: token is required in the body',
  }),
}).unknown(false);

module.exports = refreshToken;
