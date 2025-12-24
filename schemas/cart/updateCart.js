const updateCart = {
  title: 'update cart',
  description: 'defines the structure for HTTP PUT req body',
  type: 'object',
  properties: {
    publicId: {
      type: 'string',
      description: 'public guid of the cart',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    quantity: {
      type: 'integer',
      description: 'quantity',
      minimum: 1,
    },
    updatedBy: {
      type: 'string',
      description: 'unique reference of updatedBy',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    concurrencyStamp: {
      type: 'string',
      description: 'unique reference of concurrencyStamp',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
  },
  errorMessage: {
    required: {},
    properties: {},
  },
  required: ['publicId', 'quantity', 'updatedBy', 'concurrencyStamp'],
  additionalProperties: false,
}

module.exports = updateCart

