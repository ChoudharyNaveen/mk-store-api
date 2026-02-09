const Joi = require('joi');

const getBrandSummary = Joi.object({
  id: Joi.number().integer().required(),
}).unknown(false);

module.exports = getBrandSummary;
