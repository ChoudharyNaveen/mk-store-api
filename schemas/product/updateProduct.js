const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const updateProduct = Joi.object({
  publicId: Joi.string().pattern(uuidPattern).required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  categoryId: Joi.string().pattern(uuidPattern).optional(),
  branchId: Joi.string().pattern(uuidPattern).optional(),
  vendorId: Joi.string().pattern(uuidPattern).optional(),
  subCategoryId: Joi.string().pattern(uuidPattern).optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  updatedBy: Joi.string().pattern(uuidPattern).required(),
  concurrencyStamp: Joi.string().pattern(uuidPattern).required(),
}).unknown(false)

module.exports = updateProduct
