/* eslint-disable */
// Re-export all functions from segregated modules for backward compatibility
const utility = require('./utility');
const errorHandlers = require('./errorHandlers');
const databaseHelpers = require('./databaseHelpers');

module.exports = {
  // Utility functions
  convertCamelObjectToSnake: utility.convertCamelObjectToSnake,
  convertCamelToSnake: utility.convertCamelToSnake,
  convertSnakeObjectToCamel: utility.convertSnakeObjectToCamel,
  convertSnakeToCamel: utility.convertSnakeToCamel,
  convertKababToNormal: utility.convertKababToNormal,
  sanitizeStr: utility.sanitizeStr,
  postRequest: utility.postRequest,
  getRequest: utility.getRequest,
  convertToSlug: utility.convertToSlug,
  generateOtpText: utility.generateOtpText,
  generateOTP: utility.generateOTP,
  generateRandomPassword: utility.generateRandomPassword,
  dateDiff: utility.dateDiff,
  langugeProcessing: utility.langugeProcessing,
  langugeProcessingSingle: utility.langugeProcessingSingle,

  // Error handlers
  sendErrorResponse: errorHandlers.sendErrorResponse,
  extractErrorMessage: errorHandlers.extractErrorMessage,
  handleServerError: errorHandlers.handleServerError,

  // Database helpers
  generateWhereCondition: databaseHelpers.generateWhereCondition,
  generateOrderCondition: databaseHelpers.generateOrderCondition,
  extractILikeConditions: databaseHelpers.extractILikeConditions,
  whereConditionsToSQL: databaseHelpers.whereConditionsToSQL,
  calculatePagination: databaseHelpers.calculatePagination,
  withTransaction: databaseHelpers.withTransaction,
  updateWithConcurrencyStamp: databaseHelpers.updateWithConcurrencyStamp,
  findAndCountAllWithTotal: databaseHelpers.findAndCountAllWithTotal,
  findAndCountAllWithTotalQuery: databaseHelpers.findAndCountAllWithTotalQuery,
  createPaginationObject: databaseHelpers.createPaginationObject,
};
