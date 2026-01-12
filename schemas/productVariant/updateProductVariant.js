const Joi = require('joi');

const updateProductVariant = Joi.object({
  id: Joi.number().integer().required(),
  variantName: Joi.string().optional().messages({
    'string.empty': 'Parameter: variantName cannot be empty',
  }),
  variantType: Joi.string().valid('WEIGHT', 'SIZE', 'COLOR', 'MATERIAL', 'FLAVOR', 'PACKAGING', 'OTHER').optional(),
  variantValue: Joi.string().optional().allow(null),
  price: Joi.number().min(0).optional().messages({
    'number.min': 'Parameter: price must be greater than or equal to 0',
  }),
  sellingPrice: Joi.number().min(0).optional().messages({
    'number.min': 'Parameter: sellingPrice must be greater than or equal to 0',
  }),
  quantity: Joi.number().integer().min(0).optional()
    .messages({
      'number.min': 'Parameter: quantity must be greater than or equal to 0',
      'number.base': 'Parameter: quantity must be a number',
    }),
  itemQuantity: Joi.number().min(0).optional().messages({
    'number.min': 'Parameter: itemQuantity must be greater than or equal to 0',
  }),
  itemUnit: Joi.string()
    .valid(
      'LTR',
      'ML',
      'GAL',
      'FL_OZ',
      'KG',
      'G',
      'MG',
      'OZ',
      'LB',
      'TON',
      'PCS',
      'UNIT',
      'DOZEN',
      'SET',
      'PAIR',
      'BUNDLE',
      'PKG',
      'BOX',
      'BOTTLE',
      'CAN',
      'CARTON',
      'TUBE',
      'JAR',
      'BAG',
      'POUCH',
      'M',
      'CM',
      'MM',
      'FT',
      'IN',
      'SQFT',
      'SQM',
    )
    .optional()
    .messages({
      'any.only': 'Parameter: itemUnit must be a valid unit type',
    }),
  expiryDate: Joi.date().optional().messages({
    'date.base': 'Parameter: expiryDate must be a valid date',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required().messages({
    'any.required': 'Parameter: concurrencyStamp is required',
  }),
}).unknown(false);

module.exports = updateProductVariant;
