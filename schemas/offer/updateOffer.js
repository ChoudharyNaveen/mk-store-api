const updateOffer = {
  title: 'update offer',
  description: 'defines the structure for HTTP PUT req body',
  type: 'object',
  properties: {
    publicId: {
      type: 'string',
      description: 'public guid of the offer',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    title: {
      type: 'string',
      description: 'title of the offer',
    },
    description: {
      type: 'string',
      description: 'description of the offer',
    },
    discountPercentage: {
      type: 'number',
      description: 'discount percentage',
      minimum: 0,
      maximum: 100,
    },
    startDate: {
      type: 'string',
      description: 'start date',
      format: 'date-time',
    },
    endDate: {
      type: 'string',
      description: 'end date',
      format: 'date-time',
    },
    status: {
      type: 'string',
      description: 'status of the offer',
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

module.exports = updateOffer

