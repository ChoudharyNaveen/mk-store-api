
const isValidUuid = (uuid) => {
  /**
   * The Following RegExp Expression is used to ensure provided public-id is valid uuid
   * Please refers the following link for better understanding.
   * link:- https://www.npmjs.com/package/is-uuid
   * https://github.com/afram/is-uuid
   */
  const expression = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  return expression.test(uuid);
};

const isSchemaValid = ({ schema, data }) => {
  try {
    // Override .unknown(false) by creating a new schema that allows unknown fields
    // This prevents errors when extra fields are present in the request
    const schemaWithUnknownAllowed = schema.unknown(true);

    const { error } = schemaWithUnknownAllowed.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: false,
        },
      },
    });

    if (error) {
      const errors = error.details.map((detail) => {
        const fieldName = detail.path.join('.') || detail.context?.label || 'unknown';

        return {
          name: fieldName,
          message: detail.message,
        };
      });

      return { errors };
    }

    return {};
  } catch (err) {
    console.error('Validation error:', err);

    return {
      errors: [ { name: 'validation', message: 'Validation failed' } ],
    };
  }
};

module.exports = {
  isValidUuid,
  isSchemaValid,
};
