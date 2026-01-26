const Joi = require('joi');

const saveCart = Joi.object({
  productId: Joi.number().integer().required()
    .messages({
      'any.required': 'Parameter: productId is required',
      'number.base': 'Parameter: productId must be a number',
    }),
  variantId: Joi.number().integer().required()
    .messages({
      'any.required': 'Parameter: variantId is required',
      'number.base': 'Parameter: variantId must be a number',
    }),
  quantity: Joi.number().integer().required().messages({
    'any.required': 'Parameter: quantity is required',
    'number.base': 'Parameter: quantity is required',
  }),
  price: Joi.number().integer().min(0).required()
    .messages({
      'any.required': 'Parameter: price is required',
      'number.base': 'Parameter: price must be a number',
      'number.min': 'Parameter: price must be greater than or equal to 0',
    }),
  isCombo: Joi.boolean().required()
    .messages({
      'any.required': 'Parameter: isCombo is required',
      'boolean.base': 'Parameter: isCombo must be a boolean',
    }),
  vendorId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: vendorId must be a number',
  }),
  branchId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: branchId must be a number',
  }),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveCart;
