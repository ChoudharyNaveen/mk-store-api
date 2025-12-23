const verifyOtp = {
  title: 'verification form',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    email: {
      type: 'string',
      description: 'email of the user',
    },
    otp: {
      type: 'string',
      description: 'OTP',
    },
  },
  errorMessage: {
    required: {
      email: 'Parameter: email is required in the body.',
      otp: 'Parameter: otp is required in the body.',
    },
    properties: {
      email: 'Parameter: email should be valid.',
      otp: 'Parameter: otp should be valid.',
    },
  },
  required: ['email', 'otp'],
  additionalProperties: false,
}

module.exports = verifyOtp
