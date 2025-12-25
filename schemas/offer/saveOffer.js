const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const saveOffer = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Parameter: title is required',
    'string.empty': 'Parameter: title is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Parameter: description is required',
    'string.empty': 'Parameter: description is required',
  }),
  discountPercentage: Joi.number().min(0).max(100).required().messages({
    'any.required': 'Parameter: discountPercentage is required',
    'number.min': 'Parameter: discountPercentage must be between 0 and 100',
    'number.max': 'Parameter: discountPercentage must be between 0 and 100',
  }),
  startDate: Joi.date().iso().required().messages({
    'any.required': 'Parameter: startDate is required',
    'date.base': 'Parameter: startDate must be a valid date',
  }),
  endDate: Joi.date().iso().required().messages({
    'any.required': 'Parameter: endDate is required',
    'date.base': 'Parameter: endDate must be a valid date',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false)

module.exports = saveOffer
