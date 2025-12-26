const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const saveProduct = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Parameter: title is required',
    'string.empty': 'Parameter: title is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Parameter: description is required',
    'string.empty': 'Parameter: description is required',
  }),
  price: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: price is required',
    'number.min': 'Parameter: price must be greater than or equal to 0',
  }),
  categoryId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: categoryId is required',
  }),
  subCategoryId: Joi.number().integer().optional(),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
  sellingPrice: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: sellingPrice is required',
    'number.min': 'Parameter: sellingPrice must be greater than or equal to 0',
  }),
}).unknown(false)

module.exports = saveProduct
