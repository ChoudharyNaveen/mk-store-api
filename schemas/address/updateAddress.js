const Joi = require('joi');

const updateAddress = Joi.object({
  id: Joi.number().integer().required(),
  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional().allow(''),
  street: Joi.string().optional(),
  landmark: Joi.string().optional().allow(''),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  pincode: Joi.string().optional(),
  latitude: Joi.number().min(-90).max(90).optional()
    .allow(null)
    .messages({
      'number.min': 'Parameter: latitude must be between -90 and 90',
      'number.max': 'Parameter: latitude must be between -90 and 90',
    }),
  longitude: Joi.number().min(-180).max(180).optional()
    .allow(null)
    .messages({
      'number.min': 'Parameter: longitude must be between -180 and 180',
      'number.max': 'Parameter: longitude must be between -180 and 180',
    }),
  name: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  phone: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Parameter: email must be a valid email address',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateAddress;
