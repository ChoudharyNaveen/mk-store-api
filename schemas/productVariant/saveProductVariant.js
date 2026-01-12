const Joi = require('joi');

const saveProductVariant = Joi.object({
  productId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: productId is required',
  }),
  variantName: Joi.string().required().messages({
    'any.required': 'Parameter: variantName is required',
    'string.empty': 'Parameter: variantName is required',
  }),
  variantType: Joi.string().valid('WEIGHT', 'SIZE', 'COLOR', 'MATERIAL', 'FLAVOR', 'PACKAGING', 'OTHER').optional().messages({
    'any.only': 'Parameter: variantType must be one of: WEIGHT, SIZE, COLOR, MATERIAL, FLAVOR, PACKAGING, OTHER',
  }),
  variantValue: Joi.string().optional().allow(null).messages({
    'string.base': 'Parameter: variantValue must be a string',
  }),
  price: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: price is required',
    'number.min': 'Parameter: price must be greater than or equal to 0',
  }),
  sellingPrice: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: sellingPrice is required',
    'number.min': 'Parameter: sellingPrice must be greater than or equal to 0',
  }),
  quantity: Joi.number().integer().min(0).required()
    .messages({
      'any.required': 'Parameter: quantity is required',
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
  expiryDate: Joi.date().required().messages({
    'any.required': 'Parameter: expiryDate is required',
    'date.base': 'Parameter: expiryDate must be a valid date',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveProductVariant;
