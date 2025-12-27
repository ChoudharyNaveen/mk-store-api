const Joi = require('joi');

const updateVendor = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  mobile_number: Joi.string().optional(),
  address: Joi.string().optional().allow(''),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateVendor;
