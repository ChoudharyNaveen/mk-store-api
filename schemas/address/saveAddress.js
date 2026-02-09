const Joi = require('joi');

const saveAddress = Joi.object({
  addressLine1: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: addressLine1 cannot be empty',
  }),
  addressLine2: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: addressLine2 cannot be empty',
  }),
  street: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: street cannot be empty',
  }),
  landmark: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: landmark cannot be empty',
  }),
  city: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: city cannot be empty',
  }),
  state: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: state cannot be empty',
  }),
  country: Joi.string().optional().default('India').messages({
    'string.empty': 'Parameter: country cannot be empty',
  }),
  pincode: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: pincode cannot be empty',
  }),
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
  name: Joi.string().required().messages({
    'any.required': 'Parameter: name is required',
    'string.empty': 'Parameter: name is required',
  }),
  mobileNumber: Joi.string().required().messages({
    'any.required': 'Parameter: mobileNumber is required',
    'string.empty': 'Parameter: mobileNumber is required',
  }),
  phone: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: phone cannot be empty',
  }),
  email: Joi.string().email().optional().allow('')
    .messages({
      'string.email': 'Parameter: email must be a valid email address',
      'string.empty': 'Parameter: email cannot be empty',
    }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveAddress;
