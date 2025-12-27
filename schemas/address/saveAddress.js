const Joi = require('joi');

const saveAddress = Joi.object({
  house_no: Joi.string().required().messages({
    'any.required': 'Parameter: house_no is required',
    'string.empty': 'Parameter: house_no is required',
  }),
  streetDetails: Joi.string().required().messages({
    'any.required': 'Parameter: streetDetails is required',
    'string.empty': 'Parameter: streetDetails is required',
  }),
  landmark: Joi.string().required().messages({
    'any.required': 'Parameter: landmark is required',
    'string.empty': 'Parameter: landmark is required',
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
