const Validator = require('../utils/validator');
const { sendErrorResponse } = require('../utils/helper');

const validate = (schema) => (req, res, next) => {
  try {
    // Combine body, query, and params for validation
    const data = {
      ...req.body,
      ...req.query,
      ...req.params,
    };

    const { errors } = Validator.isSchemaValid({ schema, data });

    if (errors) {
      console.log('Validation errors:', JSON.stringify(errors, null, 2));

      // Ensure Content-Type is set
      res.setHeader('Content-Type', 'application/json');

      return res.status(400).json({
        success: false,
        errors: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
        message: 'field-validation',
        validationErrors: errors,
      });
    }

    // Attach validated data to request
    req.validatedData = data;

    return next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    res.setHeader('Content-Type', 'application/json');

    return sendErrorResponse(res, 500, 'Validation error', 'INTERNAL_SERVER_ERROR', error);
  }
};

module.exports = validate;
