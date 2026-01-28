const Joi = require('joi');

const updateCart = Joi.object({
  id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).optional(),
  comboId: Joi.number().integer().optional().allow(null)
    .messages({
      'number.base': 'Parameter: comboId must be a number',
    }),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateCart;
