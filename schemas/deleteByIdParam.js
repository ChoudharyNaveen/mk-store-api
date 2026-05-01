const Joi = require('joi');

/** Path param :id for DELETE /<resource>/:id */
module.exports = Joi.object({
  id: Joi.number().integer().required(),
}).unknown(false);
