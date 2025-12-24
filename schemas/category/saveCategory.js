const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const saveCategory = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Parameter: title is required',
    'string.empty': 'Parameter: title is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Parameter: description is required',
    'string.empty': 'Parameter: description is required',
  }),
  branchId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: branchId is required',
    'string.pattern.base': 'Parameter: branchId should be a valid UUID',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.string().pattern(uuidPattern).optional(),
}).unknown(false)

module.exports = saveCategory
