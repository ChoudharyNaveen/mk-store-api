const Joi = require('joi');

const saveWishlist = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required',
  }),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveWishlist;
