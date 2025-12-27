const Joi = require('joi');

const deleteCart = Joi.object({
  cartId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: cartId is required in query',
  }),
}).unknown(false);

module.exports = deleteCart;
