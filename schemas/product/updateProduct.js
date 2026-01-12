const Joi = require('joi');

const updateProduct = Joi.object({
  id: Joi.number().integer().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  categoryId: Joi.number().integer().optional(),
  branchId: Joi.number().integer().optional(),
  vendorId: Joi.number().integer().optional(),
  subCategoryId: Joi.number().integer().optional(),
  brandId: Joi.number().integer().allow(null).optional()
    .messages({
      'number.base': 'Parameter: brandId must be a number',
    }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  nutritional: Joi.string().optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
  variants: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        id: Joi.number().integer().optional(), // Required for update, not provided for new
        variantName: Joi.string().required().messages({
          'any.required': 'Variant: variantName is required',
          'string.empty': 'Variant: variantName is required',
        }),
        variantType: Joi.string().valid('WEIGHT', 'SIZE', 'COLOR', 'MATERIAL', 'FLAVOR', 'PACKAGING', 'OTHER').optional(),
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
        itemQuantity: Joi.number().min(0).optional(),
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
          .optional(),
        expiryDate: Joi.date().required().messages({
          'any.required': 'Variant: expiryDate is required',
          'date.base': 'Variant: expiryDate must be a valid date',
        }),
        status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
        concurrencyStamp: Joi.string().optional(), // Required for updates
        deleted: Joi.boolean().optional().default(false), // Mark for deletion
      }),
    ),
    Joi.string(), // Allow JSON string for multipart/form-data
  ).optional().messages({
    'array.base': 'Parameter: variants must be an array or JSON string',
  }),
  variantIdsToDelete: Joi.array().items(Joi.number().integer()).optional().messages({
    'array.base': 'Parameter: variantIdsToDelete must be an array',
  }),
  images: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        id: Joi.number().integer().optional(), // Required for update, not provided for new
        imageUrl: Joi.string().optional(), // Required for new, optional for update
        isDefault: Joi.boolean().optional(),
        displayOrder: Joi.number().integer().min(0).optional(),
        variantId: Joi.number().integer().optional().allow(null),
        status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
        concurrencyStamp: Joi.string().optional(), // Required for updates
        deleted: Joi.boolean().optional().default(false), // Mark for deletion
      }),
    ),
    Joi.string(), // Allow JSON string for multipart/form-data
  ).optional().messages({
    'array.base': 'Parameter: images must be an array or JSON string',
  }),
  imagesData: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        id: Joi.number().integer().optional(), // Required for update, not provided for new
        imageUrl: Joi.string().optional(), // Required for new, optional for update
        isDefault: Joi.boolean().optional(),
        displayOrder: Joi.number().integer().min(0).optional(),
        variantId: Joi.number().integer().optional().allow(null),
        status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
        concurrencyStamp: Joi.string().optional(), // Required for updates
        deleted: Joi.boolean().optional().default(false), // Mark for deletion
      }),
    ),
    Joi.string(), // Allow JSON string for multipart/form-data
  ).optional().messages({
    'array.base': 'Parameter: imagesData must be an array or JSON string',
  }),
  imageIdsToDelete: Joi.array().items(Joi.number().integer()).optional().messages({
    'array.base': 'Parameter: imageIdsToDelete must be an array',
  }),
}).unknown(false);

module.exports = updateProduct;
