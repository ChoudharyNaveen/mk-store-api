const deleteProduct = {
  title: 'delete product',
  description: 'Defines the structure for query parameters',
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      description: 'product id to delete',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
  },
  errorMessage: {
    required: {
      productId: 'Parameter: productId is required in query',
    },
    properties: {
      productId: 'Parameter: productId should be a valid UUID',
    },
  },
  required: ['productId'],
  additionalProperties: false,
}

module.exports = deleteProduct

