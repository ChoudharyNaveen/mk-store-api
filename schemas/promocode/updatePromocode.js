const updatePromocode = {
  title: 'update promocode',
  description: 'defines the structure for HTTP POST req body',
  type: 'object',
  properties: {
    publicId: {
      type: 'string',
      description: 'public guid of the assignment',
    },
    type: {
      type: 'string',
      description: 'type',
    },
    code: {
      type: 'string',
      description: 'code',
    },
    description: {
      type: 'text',
      description: 'description',
    },
    description: {
      type: 'string',
      description: 'description',
    },
    percentage: {
      type: 'integer',
      description: 'percentage',
    },
    startDate: {
      type: 'string',
      description: 'start date',
    },
    endDate: {
      type: 'string',
      description: 'end date',
    },
    status: {
      type: 'string',
      description: 'status of the assignment',
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

module.exports = updatePromocode
