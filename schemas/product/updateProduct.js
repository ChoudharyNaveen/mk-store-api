const Joi = require('joi');

const updateProduct = Joi.object({
  id: Joi.number().integer().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  categoryId: Joi.number().integer().optional(),
  branchId: Joi.number().integer().optional(),
  vendorId: Joi.number().integer().optional(),
  subCategoryId: Joi.number().integer().optional(),
  brandId: Joi.number().integer().allow(null).optional()
    .messages({
      'number.base': 'Parameter: brandId must be a number',
    }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  quantity: Joi.number().integer().min(0).optional()
    .messages({
      'number.min': 'Parameter: quantity must be greater than or equal to 0',
      'number.base': 'Parameter: quantity must be a number',
    }),
  itemsPerUnit: Joi.number().integer().min(1).optional()
    .messages({
      'number.min': 'Parameter: itemsPerUnit must be greater than or equal to 1',
      'number.base': 'Parameter: itemsPerUnit must be an integer',
    }),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
  expiryDate: Joi.date().optional().messages({
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

module.exports = updateProduct;
