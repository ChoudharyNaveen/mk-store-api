const saveSubCategory = {
  title: 'Add sub category form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
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
    createdBy: {
      type: 'string',
      description: 'sub category created by',
    },
  },
  errorMessage: {
    required: {
      title: 'Parameter: title is required',
      description: 'Parameter: description is required',
      categoryId: 'Parameter: categoryId is required',
    },
    properties: {},
  },
  required: ['title', 'description', 'categoryId'],
  additionalProperties: false,
}

module.exports = saveSubCategory

