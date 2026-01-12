const Joi = require('joi');

const adjustInventory = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required',
  }),
  variantId: Joi.number().integer().optional().allow(null)
    .messages({
      'number.base': 'Parameter: variantId must be a number',
    }),
  quantityChange: Joi.number().integer().required().messages({
    'any.required': 'Parameter: quantityChange is required',
    'number.base': 'Parameter: quantityChange must be a number',
  }),
  notes: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Parameter: notes must be a string',
  }),
  vendorId: Joi.number().integer().optional(),
  branchId: Joi.number().integer().optional(),
  userId: Joi.number().integer().optional(),
}).unknown(false);

module.exports = adjustInventory;
