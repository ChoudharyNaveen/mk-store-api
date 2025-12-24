const updateProduct = {
  title: 'update product',
  description: 'defines the structure for HTTP PUT req body',
  type: 'object',
  properties: {
    publicId: {
      type: 'string',
      description: 'public guid of the product',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    title: {
      type: 'string',
      description: 'title of the product',
    },
    description: {
      type: 'string',
      description: 'description of the product',
    },
    price: {
      type: 'number',
      description: 'price of the product',
      minimum: 0,
    },
    categoryId: {
      type: 'string',
      description: 'category id',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    subCategoryId: {
      type: 'string',
      description: 'sub category id',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    status: {
      type: 'string',
      description: 'status of the product',
      enum: ['ACTIVE', 'INACTIVE'],
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
  required: ['publicId', 'updatedBy', 'concurrencyStamp'],
  additionalProperties: false,
}

module.exports = updateProduct

