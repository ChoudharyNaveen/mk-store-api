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
  code: Joi.string().optional().messages({
    'string.empty': 'Parameter: code cannot be empty if provided.',
  }),
  address: Joi.string().optional().allow(''),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
  // Branch fields
  branchName: Joi.string().required().messages({
    'any.required': 'Parameter: branchName is required',
    'string.empty': 'Parameter: branchName is required',
  }),
  branchCode: Joi.string().optional().messages({
    'string.empty': 'Parameter: branchCode cannot be empty if provided.',
  }),
  addressLine1: Joi.string().optional().allow(''),
  addressLine2: Joi.string().optional().allow(''),
  street: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
  state: Joi.string().optional().allow(''),
  pincode: Joi.string().optional().allow(''),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  branchPhone: Joi.string().optional().allow(''),
  branchEmail: Joi.string().email().optional().allow('').messages({
    'string.email': 'Parameter: branchEmail should be a valid email address',
  }),
  branchStatus: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
}).unknown(false)

module.exports = saveVendor
