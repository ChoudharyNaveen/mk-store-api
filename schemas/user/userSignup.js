const userSignUp = {
  title: "Add User form",
  description: "Defines the structure for HTTP POST request body",
  type: 'object',
  properties: {
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
    },
    password: {
      type: 'string',
      description: 'password of the user',
    },
    confirm_password: {
      type: 'string',
      description: 'confirm password',
    },
    date_of_birth:{
      type: 'date',
      description: 'date of birth'
    },
    gender:{
      type: 'string',
      description: 'gender'
    },
    status: {
      type: 'string',
      description: 'status of the user',
      enum: ['ACTIVE', 'INACTIVE'],
    },
    createdBy: {
      type: 'string',
      description: 'user created by',
    },
  },
  errorMessage: {
    required: {
      name: 'Parameter:Name is required',
      password: 'Parameter:Password is required',
      confirm_password: 'Parameter:Please confirm your password',
      mobile_number: 'Parameter:Mobile number is required',
      email: 'Parameter:Email is required',
    },
    properties: {},
  },
  required: ['name', 'password', 'confirm_password', 'mobile_number', 'email'],
  additionalProperties: false,
}

module.exports = userSignUp
