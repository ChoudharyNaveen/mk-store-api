const Joi = require('joi');

const saveProduct = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Parameter: title is required',
    'string.empty': 'Parameter: title is required',
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
  createdBy: Joi.number().integer().optional(),
  variants: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        variantName: Joi.string().required().messages({
          'any.required': 'Variant: variantName is required',
          'string.empty': 'Variant: variantName is required',
        }),
        description: Joi.string().optional().allow(null).messages({
          'string.base': 'Variant: description must be a string',
        }),
        nutritional: Joi.string().optional().allow(null).messages({
          'string.base': 'Variant: nutritional must be a string',
        }),
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
        comboDiscounts: Joi.array().items(
          Joi.object({
            comboQuantity: Joi.number().integer().min(1).required()
              .messages({
                'any.required': 'ComboDiscount: comboQuantity is required',
                'number.min': 'ComboDiscount: comboQuantity must be at least 1',
              }),
            discountType: Joi.string().valid('PERCENT', 'OFFER').required().messages({
              'any.required': 'ComboDiscount: discountType is required',
              'any.only': 'ComboDiscount: discountType must be PERCENT or OFFER',
            }),
            discountValue: Joi.number().integer().min(1).required()
              .messages({
                'any.required': 'ComboDiscount: discountValue is required',
                'number.min': 'ComboDiscount: discountValue must be at least 1',
              }),
            startDate: Joi.date().required().messages({
              'any.required': 'ComboDiscount: startDate is required',
              'date.base': 'ComboDiscount: startDate must be a valid date',
            }),
            endDate: Joi.date().required().messages({
              'any.required': 'ComboDiscount: endDate is required',
              'date.base': 'ComboDiscount: endDate must be a valid date',
            }),
            status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().default('ACTIVE'),
          }),
        ).optional(),
      }),
    )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one variant is required',
        'any.required': 'Parameter: variants is required',
      }),
    Joi.string()
      .required()
      .messages({
        'any.required': 'Parameter: variants is required',
        'string.base': 'Parameter: variants must be a JSON string',
      }),
  )
    .messages({
      'alternatives.match': 'Parameter: variants must be an array or JSON string with at least one variant',
    }),
}).unknown(false);

module.exports = saveProduct;
