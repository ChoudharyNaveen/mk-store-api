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
  categoryId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: categoryId is required',
  }),
  branchId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: branchId is required',
    'string.pattern.base': 'Parameter: branchId should be a valid UUID',
  }),
  subCategoryId: Joi.string().pattern(uuidPattern).optional(),
  vendorId: Joi.string().pattern(uuidPattern).optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.string().pattern(uuidPattern).optional(),
}).unknown(false)

module.exports = saveProduct
