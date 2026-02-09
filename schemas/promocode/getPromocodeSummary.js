const Joi = require('joi');

const getPromocodeSummary = Joi.object({
  id: Joi.number().integer().required(),
}).unknown(false);

module.exports = getPromocodeSummary;
