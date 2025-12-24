const Joi = require('joi')

const getOrderItem = Joi.object({
  pageSize: Joi.number().integer().valid(10, 20, 30, 40, 50, 100, 500).required().messages({
    'any.required': 'Parameter: pageSize is required in query.',
    'any.only': 'Parameter: pageSize should be valid.',
  }),
  pageNumber: Joi.number().integer().min(1).required().messages({
    'any.required': 'Parameter: pageNumber is required in query.',
    'number.min': 'Parameter: pageNumber should be valid.',
  }),
}).unknown(false)

module.exports = getOrderItem
