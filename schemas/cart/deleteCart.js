const deleteCart = {
  title: 'delete cart',
  description: 'Defines the structure for query parameters',
  type: 'object',
  properties: {
    cartId: {
      type: 'string',
      description: 'cart id to delete',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
  },
  errorMessage: {
    required: {
      cartId: 'Parameter: cartId is required in query',
    },
    properties: {
      cartId: 'Parameter: cartId should be a valid UUID',
    },
  },
  required: ['cartId'],
  additionalProperties: false,
}

module.exports = deleteCart

