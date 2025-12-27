const Joi = require('joi');

const updateCart = Joi.object({
  id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).required(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateCart;
