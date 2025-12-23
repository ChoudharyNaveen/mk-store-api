const getCategory = {
  title: 'get category list',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    pageSize: {
      type: 'integer',
      description: 'Number of results per page',
      enum: [10, 20, 30, 40, 50, 100, 500],
    },
    pageNumber: {
      type: 'integer',
      description: 'Page number to retrieve',
      minimum: 1,
    },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Filter key',
          },
          in: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          eq: { type: 'string' },
          neq: { type: 'string' },
          gt: { type: 'string' },
          gte: { type: 'string' },
          lt: { type: 'string' },
          lte: { type: 'string' },
          like: { type: 'string' },
          iLike: { type: 'string' },
        },
        required: ['key'],
        oneOf: [
          { required: ['in'] },
          { required: ['eq'] },
          { required: ['neq'] },
          { required: ['gt'] },
          { required: ['gte'] },
          { required: ['lt'] },
          { required: ['lte'] },
          { required: ['like'] },
          { required: ['iLike'] },
        ],
      },
    },
    sorting: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Sorting key',
          },
          direction: {
            type: 'string',
            enum: ['ASC', 'DESC'],
          },
        },
        required: ['key', 'direction'],
      },
    },
  },
  required: ['pageSize', 'pageNumber'],
  additionalProperties: false,
  errorMessage: {
    required: {
      pageSize: 'Parameter: pageSize is required in the body.',
      pageNumber: 'Parameter: pageNumber is required in the body.',
    },
    properties: {
      pageSize: 'Parameter: pageSize should be valid.',
      pageNumber: 'Parameter: pageNumber should be valid.',
    },
  },
}

module.exports = getCategory
