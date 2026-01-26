const Joi = require('joi');

const saveBanner = Joi.object({
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  subCategoryId: Joi.number().integer().optional().allow(null)
    .messages({
      'number.base': 'Parameter: subCategoryId must be a number',
    }),
  imageUrl: Joi.string().optional().allow('', null).messages({
    'string.empty': 'Parameter: imageUrl cannot be empty if provided',
  }),
  displayOrder: Joi.number().integer().optional().default(0)
    .messages({
      'number.base': 'Parameter: displayOrder must be a number',
    }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE')
    .messages({
      'any.only': 'Parameter: status must be either ACTIVE or INACTIVE',
    }),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveBanner;
