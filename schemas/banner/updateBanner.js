const Joi = require('joi');

const updateBanner = Joi.object({
  id: Joi.number().integer().required(),
  vendorId: Joi.number().integer().optional(),
  branchId: Joi.number().integer().optional(),
  subCategoryId: Joi.number().integer().optional().allow(null).messages({
    'number.base': 'Parameter: subCategoryId must be a number',
  }),
  imageUrl: Joi.string().optional().messages({
    'string.empty': 'Parameter: imageUrl cannot be empty if provided',
  }),
  displayOrder: Joi.number().integer().optional().messages({
    'number.base': 'Parameter: displayOrder must be a number',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().messages({
    'any.only': 'Parameter: status must be either ACTIVE or INACTIVE',
  }),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateBanner;
