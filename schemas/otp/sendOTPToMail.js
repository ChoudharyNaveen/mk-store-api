const sendOTPToMail = {
  title: 'send OTP to mail',
  description: 'Defines the structure for HTTP POST request body',
  type: 'object',
  properties: {
    userEmail: {
      type: 'string',
      description: 'email of the user',
      format: 'email',
    },
  },
  errorMessage: {
    required: {
      userEmail: 'Parameter: userEmail is required in the body.',
    },
    properties: {
      userEmail: 'Parameter: userEmail should be a valid email address.',
    },
  },
  required: ['userEmail'],
  additionalProperties: false,
}

module.exports = sendOTPToMail

