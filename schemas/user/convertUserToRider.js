const Joi = require('joi')

const convertUserToRider = Joi.object({
  userId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: userId is required',
    'number.base': 'Parameter: userId must be a number',
  }),
}).unknown(false)

module.exports = convertUserToRider

