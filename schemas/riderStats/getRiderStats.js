const Joi = require('joi');

const getRiderStats = Joi.object({
  vendorId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Vendor ID must be a number',
      'number.integer': 'Vendor ID must be an integer',
      'number.positive': 'Vendor ID must be positive',
      'any.required': 'Vendor ID is required',
    }),
});

module.exports = getRiderStats;
