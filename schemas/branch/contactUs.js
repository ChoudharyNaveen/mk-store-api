const Joi = require('joi');

const contactUs = Joi.object({
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
}).unknown(false);

module.exports = contactUs;
