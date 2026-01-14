const Joi = require('joi');

const removeFcmToken = Joi.object({
  tokenId: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'Token ID must be a number',
      'number.integer': 'Token ID must be an integer',
      'number.positive': 'Token ID must be positive',
    }),
  fcmToken: Joi.string().optional().messages({
    'string.base': 'FCM token must be a string',
  }),
}).or('tokenId', 'fcmToken').messages({
  'object.missing': 'Either tokenId or fcmToken must be provided',
});

module.exports = removeFcmToken;
