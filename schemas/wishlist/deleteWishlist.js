const Joi = require('joi');

const deleteWishlist = Joi.object({
  wishlistId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: wishlistId is required in query',
  }),
}).unknown(false);

module.exports = deleteWishlist;
