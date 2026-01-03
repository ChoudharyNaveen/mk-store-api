/* eslint-disable */
/**
 * Send standardized error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
 * @param {Error} [error] - Optional error object for development mode
 * @returns {Object} Express response with error details
 */
const sendErrorResponse = (res, statusCode, message, code, error = null) => {
  return res.status(statusCode).json({
    success: false,
    errors: { message, code },
    message: process.env.NODE_ENV === 'development' && error ? error.message : undefined,
  });
};

/**
 * Extract error message from service error response
 * Handles different error formats: string, object with message, or object with errors property
 * @param {string|Object} serviceError - Error returned from service
 * @returns {string} Extracted error message
 */
const extractErrorMessage = (serviceError) => {
  if (!serviceError) {
    return 'An error occurred';
  }

  if (typeof serviceError === 'string') {
    return serviceError;
  }

  if (typeof serviceError === 'object') {
    if (serviceError.message) {
      return serviceError.message;
    }
    if (serviceError.errors) {
      return typeof serviceError.errors === 'string' 
        ? serviceError.errors 
        : serviceError.errors.message || 'An error occurred';
    }
    if (serviceError.error) {
      return typeof serviceError.error === 'string'
        ? serviceError.error
        : serviceError.error.message || 'An error occurred';
    }
  }

  return 'An error occurred';
};

/**
 * Common error handler for controllers
 * Logs error details and returns appropriate response
 * @param {Error} error - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Express response with error details
 */
const handleServerError = (error, req, res) => {
  console.error('\n========== SERVER ERROR ==========');
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.error('Error Message:', error?.message || 'Unknown error');
  console.error('Error Stack:', error?.stack || 'No stack trace');
  if (error?.errors) {
    console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
  }
  if (error?.response) {
    console.error('Error Response:', JSON.stringify(error.response, null, 2));
  }
  if (error?.request) {
    console.error('Error Request:', JSON.stringify(error.request, null, 2));
  }
  console.error('Full Error:', error);
  console.error('===================================\n');

  return sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR', error);
};

module.exports = {
  sendErrorResponse,
  extractErrorMessage,
  handleServerError,
};

