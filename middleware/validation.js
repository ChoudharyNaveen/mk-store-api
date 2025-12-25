const Validator = require('../utils/validator')

const validate = (schema) => {
  return (req, res, next) => {
    // Combine body, query, and params for validation
    const data = {
      ...req.body,
      ...req.query,
      ...req.params,
    }


    const { errors } = Validator.isSchemaValid({ schema, data })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    // Attach validated data to request
    req.validatedData = data
    next()
  }
}

module.exports = validate

