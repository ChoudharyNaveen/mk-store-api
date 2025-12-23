const updateAddress = {
  title: 'update address',
  description: 'defines the structure for HTTP POST req body',
  type: 'object',
  properties: {
    publicId: {
      type: 'string',
      description: 'public guid of the address',
    },
    house_no: {
      type: 'string',
      description: 'nouse number',
    },
    streetDetails: {
      type: 'string',
      description: 'street details',
    },
    landmark: {
      type: 'string',
      description: 'landmark',
    },
    name: {
      type: 'string',
      description: 'name',
    },
    mobileNumber: {
      type: 'string',
      description: 'mobile number',
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

module.exports = updateAddress
