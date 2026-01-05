const Joi = require('joi');

const updateOrder = Joi.object({
  id: Joi.number().integer().required(),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED').optional(),
  paymentStatus: Joi.string().valid('PAID', 'UNPAID', 'FAILED').optional(),
  orderPriority: Joi.string().valid('NORMAL', 'EXPRESS', 'URGENT').optional(),
  estimatedDeliveryTime: Joi.number().integer().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  shippingCharges: Joi.number().min(0).optional(),
  finalAmount: Joi.number().min(0).optional(),
  refundAmount: Joi.number().min(0).optional(),
  refundStatus: Joi.string().valid('NONE', 'PENDING', 'PROCESSED', 'FAILED').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
  notes: Joi.string().optional(),
}).unknown(false);

module.exports = updateOrder;
