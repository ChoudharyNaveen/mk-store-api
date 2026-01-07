const Joi = require('joi');

const placeOrder = Joi.object({
  vendorId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: vendorId is required',
    'number.base': 'Parameter: vendorId must be a number',
  }),
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
    'number.base': 'Parameter: branchId must be a number',
  }),
  createdBy: Joi.number().integer().optional(),
  // Address fields - either provide addressId OR all required address fields
  addressId: Joi.number().integer().optional(),
  houseNo: Joi.string().optional(),
  addressLine2: Joi.string().optional().allow(''),
  streetDetails: Joi.string().optional(),
  landmark: Joi.string().optional().allow(''),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional().default('India'),
  postalCode: Joi.string().optional(),
  name: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  // Discount fields - only one can be provided
  offerCode: Joi.string().optional(),
  promocodeId: Joi.number().integer().optional(),
  // Order priority and delivery
  orderPriority: Joi.string().valid('NORMAL', 'EXPRESS', 'URGENT').optional().default('NORMAL'),
  estimatedDeliveryTime: Joi.number().integer().min(0).optional(),
  shippingCharges: Joi.number().min(0).optional().default(0),
}).unknown(false);

module.exports = placeOrder;
