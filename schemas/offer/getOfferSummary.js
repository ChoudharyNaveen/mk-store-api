const Joi = require('joi');

const getOfferSummary = Joi.object({
  id: Joi.number().integer().required(),
}).unknown(false);

module.exports = getOfferSummary;
