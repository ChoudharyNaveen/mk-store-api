const Joi = require('joi');

const savePromocode = Joi.object({
  type: Joi.string().required().messages({
    'any.required': 'Parameter: type is requried',
    'string.empty': 'Parameter: type is requried',
  }),
  code: Joi.string().required().messages({
    'any.required': 'Parameter: code is required',
    'string.empty': 'Parameter: code is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Parameter: description is requried',
    'string.empty': 'Parameter: description is requried',
  }),
  percentage: Joi.number().integer().required().messages({
    'any.required': 'Parameter: percentage is requried',
    'number.base': 'Parameter: percentage is requried',
  }),
  startDate: Joi.string().required().messages({
    'any.required': 'Parameter:startDate is requried',
    'string.empty': 'Parameter:startDate is requried',
  }),
  endDate: Joi.string().required().messages({
    'any.required': 'Parameter: endDate is requried',
    'string.empty': 'Parameter: endDate is requried',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = savePromocode;
