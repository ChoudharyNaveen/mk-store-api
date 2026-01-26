const Joi = require('joi');

const updateCart = Joi.object({
  id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).optional(),
  price: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'Parameter: price must be a number',
      'number.min': 'Parameter: price must be greater than or equal to 0',
    }),
  isCombo: Joi.boolean().optional()
    .messages({
      'boolean.base': 'Parameter: isCombo must be a boolean',
    }),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateCart;
