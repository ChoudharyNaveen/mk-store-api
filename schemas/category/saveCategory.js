const saveCategory = {
  title: 'Add category form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'title of the category',
    },
    description: {
      type: 'string',
      description: 'description of the category',
    },
    status: {
      type: 'string',
      description: 'status of the category',
      enum: ['ACTIVE', 'INACTIVE'],
    },
    createdBy: {
      type: 'string',
      description: 'category created by',
    },
  },
  errorMessage: {
    required: {
      title: 'Parameter: title is required',
      description: 'Parameter: description is required',
    },
    properties: {},
  },
  required: ['title', 'description'],
  additionalProperties: false,
}

module.exports = saveCategory

