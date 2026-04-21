const Joi = require('joi');

const placeOrder = Joi.object({
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
    'number.base': 'Parameter: vendorId must be a number',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
    'number.base': 'Parameter: branchId must be a number',
  }),
  createdBy: Joi.number().integer().optional(),
  // Address fields - either provide addressId OR all required address fields
  addressId: Joi.number().integer().optional(),
  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional().allow(''),
  street: Joi.string().optional(),
  landmark: Joi.string().optional().allow(''),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional().default('India'),
  pincode: Joi.string().optional(),
  postalCode: Joi.string().optional(),
  latitude: Joi.number().min(-90).max(90).optional()
    .allow(null)
    .messages({
      'number.min': 'Parameter: latitude must be between -90 and 90',
      'number.max': 'Parameter: latitude must be between -90 and 90',
    }),
  longitude: Joi.number().min(-180).max(180).optional()
    .allow(null)
    .messages({
      'number.min': 'Parameter: longitude must be between -180 and 180',
      'number.max': 'Parameter: longitude must be between -180 and 180',
    }),
  name: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  // Discount fields - only one can be provided
  offerCode: Joi.string().optional(),
  promocodeId: Joi.number().integer().optional(),
  // Order priority and delivery
  orderPriority: Joi.string().valid('NORMAL', 'EXPRESS', 'URGENT').optional().default('NORMAL'),
  estimatedDeliveryTime: Joi.number().integer().min(0).optional(),
  deliveryTimeFrom: Joi.date().iso().optional().allow(null)
    .messages({
      'date.format': 'Parameter: deliveryTimeFrom must be in ISO date-time format',
      'date.base': 'Parameter: deliveryTimeFrom must be a valid date-time',
    }),
  deliveryTimeTo: Joi.date().iso().optional().allow(null)
    .messages({
      'date.format': 'Parameter: deliveryTimeTo must be in ISO date-time format',
      'date.base': 'Parameter: deliveryTimeTo must be a valid date-time',
    }),
  shippingCharges: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: shippingCharges is required',
    'number.base': 'Parameter: shippingCharges must be a number',
  }),
  distance: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: distance is required',
    'number.base': 'Parameter: distance must be a number',
  }),
  distanceMethod: Joi.string().valid('GOOGLE_MAPS', 'ROAD_API', 'HAVERSINE_FALLBACK', 'MANUAL').optional()
    .allow(null),
}).custom((value, helpers) => {
  const {
    addressId,
    addressLine1,
    street,
    city,
    state,
    pincode,
    postalCode,
    name,
    mobileNumber,
    deliveryTimeFrom,
    deliveryTimeTo,
  } = value;
  const isFromNil = deliveryTimeFrom === null || deliveryTimeFrom === undefined;
  const isToNil = deliveryTimeTo === null || deliveryTimeTo === undefined;

  if (!addressId) {
    const resolvedPincode = pincode || postalCode;
    const requiredAddressFields = {
      addressLine1,
      street,
      city,
      state,
      pincode: resolvedPincode,
      name,
      mobileNumber,
    };

    const missingAddressFields = Object.entries(requiredAddressFields)
      .filter((entry) => {
        const fieldValue = entry[1];

        return fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === '';
      })
      .map((entry) => entry[0]);

    if (missingAddressFields.length > 0) {
      return helpers.error('any.custom', {
        message: `Please provide addressId or complete address details. Missing fields: ${missingAddressFields.join(', ')}`,
      });
    }
  }

  if (isFromNil !== isToNil) {
    return helpers.error('any.custom', {
      message: 'Please provide both delivery start and end date-time, or leave both empty.',
    });
  }

  if (!isFromNil && !isToNil && new Date(deliveryTimeFrom) >= new Date(deliveryTimeTo)) {
    return helpers.error('any.custom', {
      message: 'Parameter: deliveryTimeFrom must be earlier than deliveryTimeTo',
    });
  }

  return value;
}).messages({
  'any.custom': '{{#message}}',
}).unknown(false);

module.exports = placeOrder;
