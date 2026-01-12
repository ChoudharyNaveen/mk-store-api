const Joi = require('joi');

const saveCart = Joi.object({
  productId: Joi.number().integer().optional().allow(null)
    .messages({
      'number.base': 'Parameter: productId must be a number',
    }),
  variantId: Joi.number().integer().optional().allow(null)
    .messages({
      'number.base': 'Parameter: variantId must be a number',
    }),
  quantity: Joi.number().integer().required().messages({
    'any.required': 'Parameter: quantity is required',
    'number.base': 'Parameter: quantity is required',
  }),
  vendorId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: vendorId must be a number',
  }),
  branchId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: branchId must be a number',
  }),
  createdBy: Joi.number().integer().optional(),
}).or('productId', 'variantId').messages({
  'object.missing': 'Either productId or variantId must be provided',
}).unknown(false);

module.exports = saveCart;
