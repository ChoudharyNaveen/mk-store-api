const Joi = require('joi');

const registerFcmToken = Joi.object({
  fcmToken: Joi.string().required().min(50).messages({
    'string.empty': 'FCM token is required',
    'string.min': 'FCM token must be at least 50 characters',
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
