const Joi = require('joi');

const updateBrand = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  branchId: Joi.number().integer().optional(),
  vendorId: Joi.number().integer().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateBrand;
