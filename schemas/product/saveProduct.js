const saveProduct = {
  title: 'Add product form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
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
    createdBy: {
      type: 'string',
      description: 'product created by',
    },
  },
  errorMessage: {
    required: {
      title: 'Parameter: title is required',
      description: 'Parameter: description is required',
      price: 'Parameter: price is required',
      categoryId: 'Parameter: categoryId is required',
    },
    properties: {},
  },
  required: ['title', 'description', 'price', 'categoryId'],
  additionalProperties: false,
}

module.exports = saveProduct

