const Joi = require('joi');

const savePromocode = Joi.object({
  type: Joi.string().required().messages({
    'any.required': 'Parameter: type is required',
    'string.empty': 'Parameter: type is required',
  }),
  code: Joi.string().required().messages({
    'any.required': 'Parameter: code is required',
    'string.empty': 'Parameter: code is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Parameter: description is required',
    'string.empty': 'Parameter: description is required',
  }),
  percentage: Joi.number().integer().min(0).max(100)
    .required()
    .messages({
      'any.required': 'Parameter: percentage is required',
      'number.base': 'Parameter: percentage must be a number',
      'number.min': 'Parameter: percentage must be between 0 and 100',
      'number.max': 'Parameter: percentage must be between 0 and 100',
    }),
  startDate: Joi.date().iso().required().messages({
    'any.required': 'Parameter: startDate is required',
    'date.base': 'Parameter: startDate must be a valid date',
  }),
  endDate: Joi.date().iso().required().messages({
    'any.required': 'Parameter: endDate is required',
    'date.base': 'Parameter: endDate must be a valid date',
  }),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
    'number.base': 'Parameter: vendorId must be a number',
    'number.integer': 'Parameter: vendorId must be an integer',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
    'number.base': 'Parameter: branchId must be a number',
    'number.integer': 'Parameter: branchId must be an integer',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = savePromocode;
