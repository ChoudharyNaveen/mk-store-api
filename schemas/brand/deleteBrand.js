const Joi = require('joi');

const deleteBrand = Joi.object({
  brandId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: brandId is required in query',
  }),
}).unknown(false);

module.exports = deleteBrand;
