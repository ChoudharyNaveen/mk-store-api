const Joi = require('joi');

const placeOrder = Joi.object({
  addressId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: addressId is required',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
  }),
  promocodeId: Joi.number().integer().optional(),
  createdBy: Joi.number().integer().optional(),
}).unknown(false);

module.exports = placeOrder;
