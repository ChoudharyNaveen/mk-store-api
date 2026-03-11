const Joi = require('joi');

const getRiderStats = Joi.object({
  userId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required',
    }),
  startDate: Joi.date().optional().messages({
    'date.base': 'startDate must be a valid date',
  }),
  endDate: Joi.date().optional().messages({
    'date.base': 'endDate must be a valid date',
  }),
}).with('startDate', 'endDate')
  .with('endDate', 'startDate');

module.exports = getRiderStats;
