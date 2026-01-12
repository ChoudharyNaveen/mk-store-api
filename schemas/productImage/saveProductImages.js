const Joi = require('joi');

const saveProductImages = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required',
  }),
  variantId: Joi.number().integer().optional().allow(null)
    .messages({
      'number.base': 'Parameter: variantId must be a number',
    }),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveProductImages;
