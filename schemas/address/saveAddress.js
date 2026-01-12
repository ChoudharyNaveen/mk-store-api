const Joi = require('joi');

const saveAddress = Joi.object({
  house_no: Joi.string().required().messages({
    'any.required': 'Parameter: house_no is required',
    'string.empty': 'Parameter: house_no is required',
  }),
  address_line_2: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: address_line_2 cannot be empty',
  }),
  streetDetails: Joi.string().required().messages({
    'any.required': 'Parameter: streetDetails is required',
    'string.empty': 'Parameter: streetDetails is required',
  }),
  landmark: Joi.string().optional().allow('').messages({
    'string.empty': 'Parameter: landmark cannot be empty',
  }),
  city: Joi.string().required().messages({
    'any.required': 'Parameter: city is required',
    'string.empty': 'Parameter: city is required',
  }),
  state: Joi.string().required().messages({
    'any.required': 'Parameter: state is required',
    'string.empty': 'Parameter: state is required',
  }),
  country: Joi.string().optional().default('India').messages({
    'string.empty': 'Parameter: country cannot be empty',
  }),
  postal_code: Joi.string().required().messages({
    'any.required': 'Parameter: postal_code is required',
    'string.empty': 'Parameter: postal_code is required',
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
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveAddress;
