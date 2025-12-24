const getWishlist = {
  title: 'get wishlist list',
  description: 'Defines the structure for HTTP GET request query',
  type: 'object',
  properties: {
    pageSize: {
      type: 'integer',
      description: 'Number of results per page',
      enum: [10, 20, 30, 40, 50, 100, 500],
    },
    pageNumber: {
      type: 'integer',
      description: 'Page number to retrieve',
      minimum: 1,
    },
    createdBy: {
      type: 'string',
      description: 'user id',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
  },
  required: ['pageSize', 'pageNumber', 'createdBy'],
  additionalProperties: false,
  errorMessage: {
    required: {
      pageSize: 'Parameter: pageSize is required in query.',
      pageNumber: 'Parameter: pageNumber is required in query.',
      createdBy: 'Parameter: createdBy is required.',
    },
    properties: {
      pageSize: 'Parameter: pageSize should be valid.',
      pageNumber: 'Parameter: pageNumber should be valid.',
      createdBy: 'Parameter: createdBy should be a valid UUID',
    },
  },
}

module.exports = getWishlist

