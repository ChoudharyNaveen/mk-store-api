const Joi = require('joi');

const removeFcmToken = Joi.object({
  tokenId: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'Token ID must be a number',
      'number.integer': 'Token ID must be an integer',
      'number.positive': 'Token ID must be positive',
    }),
  fcmToken: Joi.string().min(50).optional()
    .messages({
      'string.min': 'FCM token must be at least 50 characters',
    }),
}).or('tokenId', 'fcmToken')
  .messages({
    'object.missing': 'Either tokenId or fcmToken is required',
  });

module.exports = removeFcmToken;
