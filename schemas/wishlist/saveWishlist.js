const saveWishlist = {
  title: 'Add wishlist form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      description: 'product id',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    createdBy: {
      type: 'string',
      description: 'wishlist created by',
    },
  },
  errorMessage: {
    required: {
      productId: 'Parameter: productId is required',
    },
    properties: {
      productId: 'Parameter: productId should be a valid UUID',
    },
  },
  required: ['productId'],
  additionalProperties: false,
}

module.exports = saveWishlist

