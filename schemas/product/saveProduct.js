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
  nutritional: Joi.string().optional(),
  createdBy: Joi.number().integer().optional(),
  variants: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        variantName: Joi.string().required().messages({
          'any.required': 'Variant: variantName is required',
          'string.empty': 'Variant: variantName is required',
        }),
        variantType: Joi.string().valid('WEIGHT', 'SIZE', 'COLOR', 'MATERIAL', 'FLAVOR', 'PACKAGING', 'OTHER').optional().messages({
          'any.only': 'Variant: variantType must be one of: WEIGHT, SIZE, COLOR, MATERIAL, FLAVOR, PACKAGING, OTHER',
        }),
        variantValue: Joi.string().optional().allow(null),
        price: Joi.number().min(0).required().messages({
          'any.required': 'Variant: price is required',
          'number.min': 'Variant: price must be greater than or equal to 0',
        }),
        sellingPrice: Joi.number().min(0).required().messages({
          'any.required': 'Variant: sellingPrice is required',
          'number.min': 'Variant: sellingPrice must be greater than or equal to 0',
        }),
        quantity: Joi.number().integer().min(0).required()
          .messages({
            'any.required': 'Variant: quantity is required',
            'number.min': 'Variant: quantity must be greater than or equal to 0',
          }),
        itemsPerUnit: Joi.number().integer().min(1).optional()
          .messages({
            'number.min': 'Variant: itemsPerUnit must be greater than or equal to 1',
          }),
        units: Joi.string().optional(),
        itemQuantity: Joi.number().min(0).optional().messages({
          'number.min': 'Variant: itemQuantity must be greater than or equal to 0',
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
            'any.only': 'Variant: itemUnit must be a valid unit type',
          }),
        expiryDate: Joi.date().required().messages({
          'any.required': 'Variant: expiryDate is required',
          'date.base': 'Variant: expiryDate must be a valid date',
        }),
        status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
      }),
    ),
    Joi.string(), // Allow JSON string for multipart/form-data
  ).optional().messages({
    'array.base': 'Parameter: variants must be an array or JSON string',
  }),
  images: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        imageUrl: Joi.string().optional(), // For pre-uploaded URLs
        isDefault: Joi.boolean().optional().default(false),
        displayOrder: Joi.number().integer().min(0).optional()
          .default(0),
        variantId: Joi.number().integer().optional().allow(null), // For variant-specific images
      }),
    ),
    Joi.string(), // Allow JSON string for multipart/form-data
  ).optional().messages({
    'array.base': 'Parameter: images must be an array or JSON string',
  }),
  imagesData: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        imageUrl: Joi.string().required(), // For pre-uploaded URLs
        isDefault: Joi.boolean().optional().default(false),
        displayOrder: Joi.number().integer().min(0).optional()
          .default(0),
        variantId: Joi.number().integer().optional().allow(null), // For variant-specific images
      }),
    ),
    Joi.string(), // Allow JSON string for multipart/form-data
  ).optional().messages({
    'array.base': 'Parameter: imagesData must be an array or JSON string',
  }),
}).unknown(false);

module.exports = saveProduct;
