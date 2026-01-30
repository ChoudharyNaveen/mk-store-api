const Joi = require('joi');

const getDashboardKPIs = Joi.object({
  vendorId: Joi.number().integer().optional(),
  branchId: Joi.number().integer().optional(),
}).unknown(false);

module.exports = getDashboardKPIs;
