const Joi = require('joi');

const updateBranch = Joi.object({
  id: Joi.number().integer().required(),
  vendorId: Joi.number().integer().optional(),
  name: Joi.string().optional(),
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
  email: Joi.string().email().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateBranch;
