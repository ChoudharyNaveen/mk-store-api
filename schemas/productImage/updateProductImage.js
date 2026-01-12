const Joi = require('joi');

const updateProductImage = Joi.object({
  id: Joi.number().integer().required(),
  isDefault: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional()
    .messages({
      'number.min': 'Parameter: displayOrder must be greater than or equal to 0',
      'number.base': 'Parameter: displayOrder must be a number',
    }),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required().messages({
    'any.required': 'Parameter: concurrencyStamp is required',
  }),
}).unknown(false);

module.exports = updateProductImage;
