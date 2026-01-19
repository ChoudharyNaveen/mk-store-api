const Joi = require('joi');

const getSubCategoryStats = Joi.object({
  subCategoryId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: subCategoryId is required',
    'number.base': 'Parameter: subCategoryId must be a number',
  }),
  startDate: Joi.date().iso().optional().messages({
    'date.base': 'Parameter: startDate must be a valid date',
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.base': 'Parameter: endDate must be a valid date',
  }),
}).unknown(false);

module.exports = getSubCategoryStats;
