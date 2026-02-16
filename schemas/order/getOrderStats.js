const Joi = require('joi');

const getOrderStats = Joi.object({
  createdBy: Joi.number().integer().required().messages({
    'any.required': 'Parameter: createdBy is required',
    'number.base': 'Parameter: createdBy must be a number',
  }),
}).unknown(false);

module.exports = getOrderStats;
