const addPromocode = {
  title: 'Add promocode form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
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
      enum: ['ACTIVE', 'INACTIVE'],
    },
    createdBy: {
      type: 'string',
      description: 'badges created by',
    },
  },
  errorMessage: {
    required: {
      type: 'Parameter: type is requried',
      code: 'Parameter: code is required',
      description: 'Parameter: description is requried',
      percentage: 'Parameter: percentage is requried',
      startDate: 'Parameter:startDate is requried',
      endDate: 'Parameter: endDate is requried',
    },
    properties: {},
  },
  required: [
    'type',
    'code',
    'description',
    'percentage',
    'startDate',
    'endDate',
  ],
  additionalProperties: false,
}

module.exports = addPromocode
