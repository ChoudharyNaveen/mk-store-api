const Joi = require('joi')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const deleteWishlist = Joi.object({
  wishlistId: Joi.string().pattern(uuidPattern).required().messages({
    'any.required': 'Parameter: wishlistId is required in query',
    'string.pattern.base': 'Parameter: wishlistId should be a valid UUID',
  }),
}).unknown(false)

module.exports = deleteWishlist
