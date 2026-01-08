/* eslint-disable max-classes-per-file */
/**
 * Service-level error classes and utilities
 * These errors should be thrown in services to trigger transaction rollbacks
 */

/**
 * ValidationError - For validation failures (should trigger transaction rollback)
 * @extends Error
 */
class ValidationError extends Error {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

/**
 * NotFoundError - For resource not found errors
 * @extends Error
 */
class NotFoundError extends Error {
  constructor(message, code = 'NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
  }
}

/**
 * ConflictError - For conflicts (e.g., duplicate entries)
 * @extends Error
 */
class ConflictError extends Error {
  constructor(message, code = 'CONFLICT') {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
  }
}

/**
 * ConcurrencyError - For concurrency stamp mismatches
 * @extends Error
 */
class ConcurrencyError extends Error {
  constructor(message, code = 'CONCURRENCY_ERROR') {
    super(message);
    this.name = 'ConcurrencyError';
    this.code = code;
  }
}

/**
 * Handle service errors and convert them to expected response format
 * This should be used in the catch block of service functions that use transactions
 * @param {Error} error - The error object
 * @param {string} defaultMessage - Default error message if error doesn't have one
 * @returns {Object} Error object in expected format: { errors: { message, code } }
 */
const handleServiceError = (error, defaultMessage = 'Operation failed') => {
  console.error('Service Error:', error);

  // Handle custom error types
  if (error instanceof ValidationError) {
    return {
      errors: {
        message: error.message,
        code: error.code || 'VALIDATION_ERROR',
      },
    };
  }

  if (error instanceof NotFoundError) {
    return {
      errors: {
        message: error.message,
        code: error.code || 'NOT_FOUND',
      },
    };
  }

  if (error instanceof ConflictError) {
    return {
      errors: {
        message: error.message,
        code: error.code || 'CONFLICT',
      },
    };
  }

  if (error instanceof ConcurrencyError) {
    return {
      concurrencyError: {
        message: error.message,
        code: error.code || 'CONCURRENCY_ERROR',
      },
    };
  }

  // Handle generic errors
  return {
    errors: {
      message: error.message || defaultMessage,
      code: 'INTERNAL_ERROR',
    },
  };
};

module.exports = {
  ValidationError,
  NotFoundError,
  ConflictError,
  ConcurrencyError,
  handleServiceError,
};
