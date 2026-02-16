const Joi = require('joi');

const getRiderStats = Joi.object({
  userId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required',
    }),
});

module.exports = getRiderStats;
