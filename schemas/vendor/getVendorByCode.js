const Joi = require('joi')

const getVendorByCode = Joi.object({
  code: Joi.string().required().messages({
    'any.required': 'Parameter: code is required in query.',
    'string.empty': 'Parameter: code cannot be empty.',
  }),
}).unknown(false)

module.exports = getVendorByCode

