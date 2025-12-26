const Joi = require('joi')

const saveSubCategory = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Parameter: subCategoryName is required',
    'string.empty': 'Parameter: subCategoryName is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Parameter: description is required',
    'string.empty': 'Parameter: description is required',
  }),
  categoryId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: categoryId is required',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false)

module.exports = saveSubCategory
