const Joi = require('joi');

const updateUser = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().optional(),
  mobile_number: Joi.string().optional(),
  email: Joi.string().email().optional(),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.number().integer().required(),
  concurrencyStamp: Joi.string().required(),
}).unknown(false);

module.exports = updateUser;
