const Joi = require('joi');

const updateAddress = Joi.object({
  id: Joi.number().integer().required(),
  house_no: Joi.string().optional(),
  address_line_2: Joi.string().optional().allow(''),
  streetDetails: Joi.string().optional(),
  landmark: Joi.string().optional().allow(''),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  postal_code: Joi.string().optional(),
  name: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateAddress;
