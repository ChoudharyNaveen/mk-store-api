const updateSubCategory = {
  title: 'update sub category',
  description: 'defines the structure for HTTP PUT req body',
  type: 'object',
  properties: {
    publicId: {
      type: 'string',
      description: 'public guid of the sub category',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    title: {
      type: 'string',
      description: 'title of the sub category',
    },
    description: {
      type: 'string',
      description: 'description of the sub category',
    },
    categoryId: {
      type: 'string',
      description: 'category id',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    status: {
      type: 'string',
      description: 'status of the sub category',
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

module.exports = updateSubCategory

