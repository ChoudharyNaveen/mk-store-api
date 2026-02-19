const Joi = require('joi');

const getProductsSummary = Joi.object({
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
    'number.base': 'Parameter: branchId must be a number',
  }),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
    'number.base': 'Parameter: vendorId must be a number',
  }),
}).unknown(false);

module.exports = getProductsSummary;
