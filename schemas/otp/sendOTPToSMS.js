const sendOTPToSMS = {
  title: 'send OTP to SMS',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    mobileNumber: {
      type: 'string',
      description: 'mobile number of the user in E.164 format',
      minLength: 1,
      pattern: '^\\+[1-9]\\d{1,14}$',
    },
  },
  errorMessage: {
    required: {
      mobileNumber: 'Parameter: mobileNumber is required in the body.',
    },
    properties: {
      mobileNumber: 'Parameter: mobileNumber cannot be empty and should be in E.164 format (e.g., +1234567890).',
    },
  },
  required: ['mobileNumber'],
  additionalProperties: false,
}

module.exports = sendOTPToSMS

