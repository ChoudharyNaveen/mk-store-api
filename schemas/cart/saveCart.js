const addToCart = {
  title: 'Add cart form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      description: 'product id',
    },
    quantity: {
      type: 'integer',
      description: 'quantity',
    },
    createdBy: {
      type: 'string',
      description: 'badges created by',
    },
  },
  errorMessage: {
    required: {
      productId: 'Parameter: productId is requried',
      quantity: 'Parameter: quantity is required',
    },
    properties: {},
  },
  required: [
    'productId',
    'quantity',
  ],
  additionalProperties: false,
}

module.exports = addToCart
