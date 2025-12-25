const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const deleteWishlist = Joi.object({
  wishlistId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: wishlistId is required in query',
  }),
}).unknown(false)

module.exports = deleteWishlist
