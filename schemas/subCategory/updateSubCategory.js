const Joi = require('joi');

const updateSubCategory = Joi.object({
  id: Joi.number().integer().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  categoryId: Joi.number().integer().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateSubCategory;
