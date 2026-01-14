const Joi = require('joi');

const updateRiderStats = Joi.object({
  vendorId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Vendor ID must be a number',
      'number.integer': 'Vendor ID must be an integer',
      'number.positive': 'Vendor ID must be positive',
      'any.required': 'Vendor ID is required',
    }),
  totalOrders: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'Total orders must be a number',
      'number.integer': 'Total orders must be an integer',
      'number.min': 'Total orders cannot be negative',
    }),
  totalDeliveries: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'Total deliveries must be a number',
      'number.integer': 'Total deliveries must be an integer',
      'number.min': 'Total deliveries cannot be negative',
    }),
  completedOrders: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'Completed orders must be a number',
      'number.integer': 'Completed orders must be an integer',
      'number.min': 'Completed orders cannot be negative',
    }),
  cancelledOrders: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'Cancelled orders must be a number',
      'number.integer': 'Cancelled orders must be an integer',
      'number.min': 'Cancelled orders cannot be negative',
    }),
  rating: Joi.number().min(0).max(5).allow(null)
    .optional()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating cannot be negative',
      'number.max': 'Rating cannot exceed 5',
    }),
});

module.exports = updateRiderStats;
