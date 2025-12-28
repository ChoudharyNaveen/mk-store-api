const Joi = require('joi');

const saveBrand = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Parameter: name is required',
    'string.empty': 'Parameter: name is required',
  }),
  description: Joi.string().optional(),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveBrand;
