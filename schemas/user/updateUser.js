const updateUser = {
  title: 'update user',
  description: 'defines the structure for HTTP PUT req body',
  type: 'object',
  properties: {
    publicId: {
      type: 'string',
      description: 'public guid of the user',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    name: {
      type: 'string',
      description: 'name of the user',
    },
    mobile_number: {
      type: 'string',
      description: 'mobile number of the user',
    },
    email: {
      type: 'string',
      description: 'email of the user',
      format: 'email',
    },
    date_of_birth: {
      type: 'string',
      description: 'date of birth',
      format: 'date',
    },
    gender: {
      type: 'string',
      description: 'gender',
      enum: ['MALE', 'FEMALE', 'OTHER'],
    },
    status: {
      type: 'string',
      description: 'status of the user',
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

module.exports = updateUser

