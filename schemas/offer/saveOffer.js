const saveOffer = {
  title: 'Add offer form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
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
    createdBy: {
      type: 'string',
      description: 'offer created by',
    },
  },
  errorMessage: {
    required: {
      title: 'Parameter: title is required',
      description: 'Parameter: description is required',
      discountPercentage: 'Parameter: discountPercentage is required',
      startDate: 'Parameter: startDate is required',
      endDate: 'Parameter: endDate is required',
    },
    properties: {},
  },
  required: ['title', 'description', 'discountPercentage', 'startDate', 'endDate'],
  additionalProperties: false,
}

module.exports = saveOffer

