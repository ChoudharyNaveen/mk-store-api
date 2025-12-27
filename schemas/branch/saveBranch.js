const Joi = require('joi');

const saveBranch = Joi.object({
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
  }),
  name: Joi.string().required().messages({
    'any.required': 'Parameter: name is required',
    'string.empty': 'Parameter: name is required',
  }),
  code: Joi.string().optional().messages({
    'string.empty': 'Parameter: code cannot be empty if provided.',
  }),
  addressLine1: Joi.string().optional().allow(''),
  addressLine2: Joi.string().optional().allow(''),
  street: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
  state: Joi.string().optional().allow(''),
  pincode: Joi.string().optional().allow(''),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional().messages({
    'string.email': 'Parameter: email should be a valid email address',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveBranch;
