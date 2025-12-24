const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const saveVendor = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Parameter: name is required',
    'string.empty': 'Parameter: name is required',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Parameter: email is required',
    'string.email': 'Parameter: email should be a valid email address',
    'string.empty': 'Parameter: email is required',
  }),
  mobile_number: Joi.string().required().messages({
    'any.required': 'Parameter: mobile_number is required',
    'string.empty': 'Parameter: mobile_number is required',
  }),
  address: Joi.string().optional().allow(''),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.string().pattern(uuidPattern).optional(),
}).unknown(false)

module.exports = saveVendor
