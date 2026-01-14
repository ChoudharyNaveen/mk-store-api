const Joi = require('joi');

const registerFcmToken = Joi.object({
  fcmToken: Joi.string().required().min(50).messages({
    'string.empty': 'FCM token is required',
    'string.min': 'FCM token must be at least 50 characters',
  }),
  vendorId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Vendor ID must be a number',
      'number.integer': 'Vendor ID must be an integer',
      'number.positive': 'Vendor ID must be positive',
      'any.required': 'Vendor ID is required',
    }),
  branchId: Joi.number().integer().positive().allow(null)
    .optional()
    .messages({
      'number.base': 'Branch ID must be a number',
      'number.integer': 'Branch ID must be an integer',
      'number.positive': 'Branch ID must be positive',
    }),
  deviceType: Joi.string().valid('android', 'ios', 'web').allow(null).optional()
    .messages({
      'any.only': 'Device type must be one of: android, ios, web',
    }),
  deviceId: Joi.string().allow(null, '').optional().messages({
    'string.base': 'Device ID must be a string',
  }),
});

module.exports = registerFcmToken;
