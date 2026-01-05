const Joi = require('joi');

const saveProduct = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Parameter: title is required',
    'string.empty': 'Parameter: title is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Parameter: description is required',
    'string.empty': 'Parameter: description is required',
  }),
  price: Joi.number().min(0).required().messages({
    'any.required': 'Parameter: price is required',
    'number.min': 'Parameter: price must be greater than or equal to 0',
  }),
  categoryId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: categoryId is required',
  }),
  subCategoryId: Joi.number().integer().optional(),
  brandId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: brandId must be a number',
  }),
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  units: Joi.string().required().messages({
    'any.required': 'Parameter: units is required',
  }),
  nutritional: Joi.string().optional(),
  createdBy: Joi.number().integer().optional(),
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
  itemsPerUnit: Joi.number().integer().min(1).optional()
    .messages({
      'number.min': 'Parameter: itemsPerUnit must be greater than or equal to 1',
      'number.base': 'Parameter: itemsPerUnit must be an integer',
    }),
  expiryDate: Joi.date().required().messages({
    'any.required': 'Parameter: expiryDate is required',
    'date.base': 'Parameter: expiryDate must be a valid date',
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
}).unknown(false);

module.exports = saveProduct;
