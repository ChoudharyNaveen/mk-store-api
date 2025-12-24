const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const saveBranch = Joi.object({
  vendorId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: vendorId is required',
    'string.pattern.base': 'Parameter: vendorId should be a valid UUID',
  }),
  name: Joi.string().required().messages({
    'any.required': 'Parameter: name is required',
    'string.empty': 'Parameter: name is required',
  }),
  address: Joi.string().required().messages({
    'any.required': 'Parameter: address is required',
    'string.empty': 'Parameter: address is required',
  }),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional().messages({
    'string.email': 'Parameter: email should be a valid email address',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.string().pattern(uuidPattern).optional(),
}).unknown(false)

module.exports = saveBranch
