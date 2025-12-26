const Joi = require('joi');

const saveCart = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required',
  }),
  quantity: Joi.number().integer().required().messages({
    'any.required': 'Parameter: quantity is required',
    'number.base': 'Parameter: quantity is required',
  }),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveCart;
