const Joi = require('joi');

const getRelatedBrands = Joi.object({
  productId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: productId must be a number',
  }),
  subCategoryId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: subCategoryId must be a number',
  }),
  productTypeId: Joi.number().integer().optional().allow(null)
    .messages({
      'number.base': 'Parameter: productTypeId must be a number',
    }),
  vendorId: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: vendorId must be a number',
  }),
})
  .or('productId', 'subCategoryId', 'productTypeId')
  .messages({
    'object.missing': 'At least one of productId, subCategoryId or productTypeId is required',
  })
  .unknown(false);

module.exports = getRelatedBrands;
