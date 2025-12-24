const deleteWishlist = {
  title: 'delete wishlist',
  description: 'Defines the structure for query parameters',
  type: 'object',
  properties: {
    wishlistId: {
      type: 'string',
      description: 'wishlist id to delete',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
  },
  errorMessage: {
    required: {
      wishlistId: 'Parameter: wishlistId is required in query',
    },
    properties: {
      wishlistId: 'Parameter: wishlistId should be a valid UUID',
    },
  },
  required: ['wishlistId'],
  additionalProperties: false,
}

module.exports = deleteWishlist

