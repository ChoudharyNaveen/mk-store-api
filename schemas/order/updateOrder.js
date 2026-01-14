const Joi = require('joi');
const { ORDER_STATUS_ENUM } = require('../../utils/constants/orderStatusConstants');
const { REFUND_STATUS_ENUM } = require('../../utils/constants/refundStatusConstants');
const { PAYMENT_STATUS_ENUM } = require('../../utils/constants/paymentStatusConstants');

const updateOrder = Joi.object({
  id: Joi.number().integer().required(),
  status: Joi.string().valid(...ORDER_STATUS_ENUM).optional(),
  paymentStatus: Joi.string().valid(...PAYMENT_STATUS_ENUM).optional(),
  orderPriority: Joi.string().valid('NORMAL', 'EXPRESS', 'URGENT').optional(),
  estimatedDeliveryTime: Joi.number().integer().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  shippingCharges: Joi.number().min(0).optional(),
  finalAmount: Joi.number().min(0).optional(),
  refundAmount: Joi.number().min(0).optional(),
  refundStatus: Joi.string().valid(...REFUND_STATUS_ENUM).optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
  notes: Joi.string().optional(),
}).unknown(false);

module.exports = updateOrder;
