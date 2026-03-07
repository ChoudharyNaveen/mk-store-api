const Validator = require('../utils/validator');
const { sendErrorResponse, extractErrorMessage } = require('../utils/helper');

const validate = (schema) => (req, res, next) => {
  try {
    // Combine body, query, and params for validation
    // For multipart/form-data, multer populates req.body with form fields
    const data = {
      ...req.body,
      ...req.query,
      ...req.params,
    };

    const { errors } = Validator.isSchemaValid({ schema, data });

    if (errors) {
      console.log('Validation errors:', JSON.stringify(errors, null, 2));

      // Build human-readable message from first error (or combined)
      const message = Array.isArray(errors) && errors.length > 0
        ? errors
          .map((e) => {
            if (!e) return null;
            const msg = e.message || (typeof e === 'string' ? e : null);

            if (!msg) return null;

            return e.name ? `${e.name}: ${msg}` : msg;
          })
          .filter(Boolean)
          .join('. ') || 'Validation failed'
        : 'Validation failed';

      res.setHeader('Content-Type', 'application/json');

      return res.status(400).json({
        success: false,
        errors: { message, code: 'VALIDATION_ERROR' },
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

    return sendErrorResponse(res, 500, extractErrorMessage(error), 'INTERNAL_SERVER_ERROR', error);
  }
};

module.exports = validate;
