const userLogin = {
  title: 'user login',
  description: 'HTTP Post req body',
  type: 'object',
  properties: {
    email: {
      type: 'string',
      description: 'email of the user',
    },
    mobile_number: {
      type: 'string',
      description: 'mobile number of the user',
    },
    password: {
      type: 'string',
      description: 'password of the user',
    },
  },
  errorMessage: {
    required: {
      password: 'Parameter: password is required in the body',
    },
    properties: {},
  },
  required: ['password'],
  additionalProperties: false,
}

module.exports = userLogin
