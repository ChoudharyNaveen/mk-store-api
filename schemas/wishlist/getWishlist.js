const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const getWishlist = Joi.object({
  pageSize: Joi.number().integer().valid(10, 20, 30, 40, 50, 100, 500).required().messages({
    'any.required': 'Parameter: pageSize is required in query.',
    'any.only': 'Parameter: pageSize should be valid.',
  }),
  pageNumber: Joi.number().integer().min(1).required().messages({
    'any.required': 'Parameter: pageNumber is required in query.',
    'number.min': 'Parameter: pageNumber should be valid.',
  }),
  createdBy: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: createdBy is required.',
    'string.pattern.base': 'Parameter: createdBy should be a valid UUID',
  }),
}).unknown(false)

module.exports = getWishlist
