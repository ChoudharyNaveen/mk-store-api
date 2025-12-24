const Joi = require('joi')

const userSignUp = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Parameter:Name is required',
    'string.empty': 'Parameter:Name is required',
  }),
  mobile_number: Joi.string().required().messages({
    'any.required': 'Parameter:Mobile number is required',
    'string.empty': 'Parameter:Mobile number is required',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Parameter:Email is required',
    'string.email': 'Parameter:Email should be a valid email address',
    'string.empty': 'Parameter:Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Parameter:Password is required',
    'string.empty': 'Parameter:Password is required',
  }),
  confirm_password: Joi.string().required().messages({
    'any.required': 'Parameter:Please confirm your password',
    'string.empty': 'Parameter:Please confirm your password',
  }),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.string().optional(),
}).unknown(false)

module.exports = userSignUp
