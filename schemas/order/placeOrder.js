const placeOrder = {
  title: 'place order form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    addressId: {
      type: 'string',
      description: 'address id',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    promocodeId: {
      type: 'string',
      description: 'promocode id',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    createdBy: {
      type: 'string',
      description: 'order created by',
    },
  },
  errorMessage: {
    required: {
      addressId: 'Parameter: addressId is required',
    },
    properties: {
      addressId: 'Parameter: addressId should be a valid UUID',
      promocodeId: 'Parameter: promocodeId should be a valid UUID',
    },
  },
  required: ['addressId'],
  additionalProperties: false,
}

module.exports = placeOrder

