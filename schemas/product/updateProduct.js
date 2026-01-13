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
  variants: Joi.string().optional().messages({
    'string.base': 'Parameter: variants must be a JSON string',
  }),
  variantIdsToDelete: Joi.string().optional().messages({
    'string.base': 'Parameter: variantIdsToDelete must be a JSON string',
  }),
  images: Joi.string().optional().messages({
    'string.base': 'Parameter: images must be a JSON string',
  }),
  imagesData: Joi.string().optional().messages({
    'string.base': 'Parameter: imagesData must be a JSON string',
  }),
  imageIdsToDelete: Joi.string().optional().messages({
    'string.base': 'Parameter: imageIdsToDelete must be a JSON string',
  }),
}).unknown(false);

module.exports = updateProduct;
