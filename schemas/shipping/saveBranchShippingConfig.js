const Joi = require('joi');

const saveBranchShippingConfig = Joi.object({
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  distanceThresholdKm: Joi.number().min(0).optional().default(3.0)
    .messages({
      'number.min': 'Parameter: distanceThresholdKm must be greater than or equal to 0',
    }),
  withinThresholdBaseCharge: Joi.number().min(0).optional().default(20.0)
    .messages({
      'number.min': 'Parameter: withinThresholdBaseCharge must be greater than or equal to 0',
    }),
  withinThresholdFreeAbove: Joi.number().min(0).optional().default(199.0)
    .messages({
      'number.min': 'Parameter: withinThresholdFreeAbove must be greater than or equal to 0',
    }),
  aboveThresholdSamedayBaseCharge: Joi.number().min(0).optional().default(120.0)
    .messages({
      'number.min': 'Parameter: aboveThresholdSamedayBaseCharge must be greater than or equal to 0',
    }),
  aboveThresholdSamedayDiscountedCharge: Joi.number().min(0).optional().default(50.0)
    .messages({
      'number.min': 'Parameter: aboveThresholdSamedayDiscountedCharge must be greater than or equal to 0',
    }),
  aboveThresholdSamedayFreeAbove: Joi.number().min(0).optional().default(399.0)
    .messages({
      'number.min': 'Parameter: aboveThresholdSamedayFreeAbove must be greater than or equal to 0',
    }),
  aboveThresholdNextdayBaseCharge: Joi.number().min(0).optional().default(50.0)
    .messages({
      'number.min': 'Parameter: aboveThresholdNextdayBaseCharge must be greater than or equal to 0',
    }),
  aboveThresholdNextdayFreeAbove: Joi.number().min(0).optional().default(399.0)
    .messages({
      'number.min': 'Parameter: aboveThresholdNextdayFreeAbove must be greater than or equal to 0',
    }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = saveBranchShippingConfig;
