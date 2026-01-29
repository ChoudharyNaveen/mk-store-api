const Joi = require('joi');

const saveProductType = Joi.object({
  subCategoryId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: subCategoryId is required',
  }),
  title: Joi.string().required().messages({
    'any.required': 'Parameter: title is required',
    'string.empty': 'Parameter: title is required',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveProductType;
