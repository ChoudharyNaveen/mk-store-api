const Joi = require('joi');

const getOrderDetails = Joi.object({
  orderId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: orderId is required',
    'number.base': 'Parameter: orderId must be a number',
  }),
}).unknown(false);

module.exports = getOrderDetails;
