const addAddress = {
  title: 'Add address form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
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
      enum: ['ACTIVE', 'INACTIVE'],
    },
    createdBy: {
      type: 'string',
      description: 'address created by',
    },
  },
  errorMessage: {
    required: {
      houseNo: 'Parameter: house no is requried',
      streetDetails: 'Parameter: streetDetails is required',
      landmark: 'Parameter: landmark is requried',
      name: 'Parameter: name is requried',
      mobileNumber: 'Parameter:mobileNumber is requried',
    },
    properties: {},
  },
  required: ['houseNo', 'streetDetails', 'landmark', 'name', 'mobileNumber'],
  additionalProperties: false,
}

module.exports = addAddress
