const verifyOTPBySMS = {
  title: 'verification form for SMS OTP',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    mobileNumber: {
      type: 'string',
      description: 'mobile number of the user in E.164 format',
      minLength: 1,
      pattern: '^\\+[1-9]\\d{1,14}$',
    },
    otp: {
      type: 'string',
      description: 'OTP',
    },
  },
  errorMessage: {
    required: {
      mobileNumber: 'Parameter: mobileNumber is required in the body.',
      otp: 'Parameter: otp is required in the body.',
    },
    properties: {
      mobileNumber: 'Parameter: mobileNumber cannot be empty and should be in E.164 format (e.g., +1234567890).',
      otp: 'Parameter: otp should be valid.',
    },
  },
  required: ['mobileNumber', 'otp'],
  additionalProperties: false,
}

module.exports = verifyOTPBySMS

