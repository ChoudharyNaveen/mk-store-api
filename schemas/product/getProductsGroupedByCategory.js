const getProductsGroupedByCategory = {
  title: 'get products grouped by category',
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
  },
  required: ['pageSize', 'pageNumber'],
  additionalProperties: false,
  errorMessage: {
    required: {
      pageSize: 'Parameter: pageSize is required in query.',
      pageNumber: 'Parameter: pageNumber is required in query.',
    },
    properties: {
      pageSize: 'Parameter: pageSize should be valid.',
      pageNumber: 'Parameter: pageNumber should be valid.',
    },
  },
}

module.exports = getProductsGroupedByCategory

