const Validator = require('../utils/validator')

const validate = (schema) => {
  return (req, res, next) => {
    // Combine body, query, and params for validation
    const data = {
      ...req.body,
      ...req.query,
      ...req.params,
    }

    // Convert pageSize and pageNumber to numbers if they exist (from query params)
    if (data.pageSize) {
      data.pageSize = parseInt(data.pageSize, 10)
    }
    if (data.pageNumber) {
      data.pageNumber = parseInt(data.pageNumber, 10)
    }

    // Add user info if authenticated
    if (req.user) {
      const userPublicId = req.user.publicId || req.user.public_id || req.user.userId
      if (userPublicId) {
        data.createdBy = userPublicId
        data.updatedBy = userPublicId
      }
    }

    // Add concurrency stamp from header if present
    if (req.headers['x-concurrencystamp']) {
      data.concurrencyStamp = req.headers['x-concurrencystamp']
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

