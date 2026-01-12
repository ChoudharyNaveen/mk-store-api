const Joi = require('joi');

const calculateShippingCharges = Joi.object({
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  addressId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: addressId must be a number',
  }),
  latitude: Joi.number().optional().when('addressId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }).messages({
    'number.base': 'Parameter: latitude must be a number',
    'any.required': 'Parameter: latitude is required when addressId is not provided',
  }),
  longitude: Joi.number().optional().when('addressId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }).when('latitude', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  })
    .messages({
      'number.base': 'Parameter: longitude must be a number',
      'any.required': 'Parameter: longitude is required when latitude is provided',
    }),
  orderAmount: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: orderAmount is required',
    'number.min': 'Parameter: orderAmount must be greater than or equal to 0',
  }),
  deliveryType: Joi.string().valid('SAME_DAY', 'NEXT_DAY').optional().default('NEXT_DAY')
    .messages({
      'any.only': 'Parameter: deliveryType must be either SAME_DAY or NEXT_DAY',
    }),
})
  .or('addressId', 'latitude')
  .messages({
    'object.missing': 'Either addressId OR (latitude and longitude) must be provided',
  })
  .unknown(false);

module.exports = calculateShippingCharges;
