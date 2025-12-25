const Joi = require('joi')

const createVendorAdmin = Joi.object({
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
  }),
  name: Joi.string().required().messages({
    'any.required': 'Parameter: name is required',
    'string.empty': 'Parameter: name is required',
  }),
  mobile_number: Joi.string().required().messages({
    'any.required': 'Parameter: mobile_number is required',
    'string.empty': 'Parameter: mobile_number is required',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Parameter: email is required',
    'string.email': 'Parameter: email should be a valid email address',
    'string.empty': 'Parameter: email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Parameter: password is required',
    'string.min': 'Parameter: password should be at least 6 characters',
    'string.empty': 'Parameter: password is required',
  }),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().valid('MALE', 'FEMALE').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
}).unknown(false)

module.exports = createVendorAdmin
