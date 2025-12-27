/* eslint-disable */
const convertCamelCase = require('lodash.camelcase');
const convertSnakeCase = require('lodash.snakecase');
const moment = require('moment');
const axios = require('axios');
const crypto = require('crypto');
const { fn, col, where: sequelizeWhere } = require('sequelize');
const {
  Sequelize: { Op },
} = require('../database');

const convertCamelObjectToSnake = (payload) => {
  const obj = {
    ...payload,
  };
  const response = {};
  const objectKeys = Object.keys(obj);

  objectKeys.map((key) => {
    const convertedKey = convertSnakeCase(key);

    response[convertedKey] = obj[key];

    return true;
  });

  return response;
};

const convertCamelToSnake = (payload) => {
  const payloadDataType = typeof payload;

  switch (payloadDataType) {
    case 'string':
      return convertSnakeCase(payload);

    case 'object':
      return convertCamelObjectToSnake(payload);

    default:
      return payload;
  }
};

const convertSnakeObjectToCamel = (payload) => {
  const obj = {
    ...payload,
  };
  const response = {};
  const objectKeys = Object.keys(obj);

  objectKeys.map((key) => {
    const convertedKey = convertCamelCase(key);

    if (
      obj[key]
      && Object.prototype.toString.call(obj[key]) === '[object Object]'
      && !(obj[key] instanceof Date)
    ) {
      const { dataValues } = obj[key];
      let result;

      if (dataValues) {
        result = convertSnakeObjectToCamel(dataValues);
      } else {
        result = convertSnakeObjectToCamel(obj[key]);
      }

      response[convertedKey] = result;
    } else if (
      obj[key]
      && Object.prototype.toString.call(obj[key]) === '[object Array]'
      && !(obj[key] instanceof Date)
    ) {
      const rows = [];

      obj[key].forEach((element) => {
        const { dataValues: dataValues2 } = element;
        let result;

        if (dataValues2) {
          // eslint-disable-next-line no-use-before-define
          result = convertSnakeToCamel(dataValues2);
        } else {
          // eslint-disable-next-line no-use-before-define
          result = convertSnakeToCamel(element);
        }
        rows.push(result);
      });

      response[convertedKey] = rows;
    } else {
      response[convertedKey] = obj[key];
    }

    return true;
  });

  return response;
};

const convertSnakeToCamel = (payload) => {
  const payloadDataType = typeof payload;

  switch (payloadDataType) {
    case 'string':
      return convertCamelCase(payload);

    case 'object':
      return convertSnakeObjectToCamel(payload);

    default:
      return payload;
  }
};

const convertKababToNormal = (payload) => {
  const payloadDataType = typeof payload;

  switch (payloadDataType) {
    case 'string':
      return convertCamelCase(payload);

    case 'object':
      return convertSnakeObjectToCamel(payload);

    default:
      return payload;
  }
};

const sanitizeStr = (regex, str, data) => {
  const sanitizedStr = str.replace(regex, data);

  return sanitizedStr;
};

const postRequest = async ({ url, data, headers }) => {
  try {
    const response = await axios({
      url: `${url}`,
      method: 'post',
      data,
      headers: headers || {
        'cache-control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    const { response } = error;

    if (!response) {
      return {
        errors: [
          {
            name: 'server',
            message: 'There is some issue, Please try after some time',
          },
        ],
      };
    }
    const {
      response: { status, data: responseData },
    } = error;

    if (status === 404) {
      return {
        status,
        errors: [{ name: 'server', message: 'Resources are not available' }],
      };
    }
    if (status === 401) {
      return {
        status,
        errors: [{ name: 'server', message: 'Resources are not available' }],
      };
    }
    if (status === 400 && responseData) {
      const { details } = responseData;

      if (details) {
        return { errors: details };
      }

      return {
        status,
        errors: [{ name: 'server', message: 'Resources are not available' }],
      };
    }

    return {
      status,
      errors: [
        {
          name: 'server',
          message: 'There is some issue, Please try after some time',
        },
      ],
    };
  }
};

const getRequest = async ({ url, headers }) => {
  try {
    const response = await axios({
      url: `${url}`,
      method: 'get',
      headers,
    });

    return response;
  } catch (error) {
    const {
      response: { status },
    } = error || { response: {} };

    if (status === 404) {
      return {
        errors: [{ name: 'server', message: 'Resources are not available.' }],
      };
    }

    return {
      errors: [
        {
          name: 'server',
          message: 'There is some issue, Please try after some time.',
        },
      ],
    };
  }
};

const generateWhereCondition = (data) => {
  const where = {};

  (data || []).forEach((element) => {
    const { key: KeyCamelCase, ...values } = element;

    const [key1, key2] = KeyCamelCase.split('.');

    const key = key2
      ? `${key1}.${convertSnakeCase(key2)}`
      : convertSnakeCase(key1);

    const [secondKey] = Object.keys(values);

    let value;

    if (secondKey === 'eq') {
      value = { [Op.eq]: values[secondKey] };
    }
    if (secondKey === 'in') {
      value = { [Op.in]: values[secondKey] };
    }
    if (secondKey === 'nin') {
      value = { [Op.notIn]: values[secondKey] };
    }
    if (secondKey === 'neq') {
      value = { [Op.ne]: values[secondKey] };
    }
    if (secondKey === 'gt') {
      value = { [Op.gt]: values[secondKey] };
    }
    if (secondKey === 'gte') {
      value = { [Op.gte]: values[secondKey] };
    }
    if (secondKey === 'lt') {
      value = { [Op.lt]: values[secondKey] };
    }
    if (secondKey === 'lte') {
      value = { [Op.lte]: values[secondKey] };
    }
    if (secondKey === 'like') {
      value = { [Op.like]: `%${values[secondKey]}%` };
    }

    if (secondKey === 'iLike') {
      if (secondKey === 'iLike') {
        const searchValue = `%${values[secondKey].toLowerCase()}%`;
        const condition = sequelizeWhere(fn('LOWER', col(key)), {
          [Op.like]: searchValue,
        });

        if (!where[Op.and]) where[Op.and] = [];
        where[Op.and].push(condition);

        return;
      }
    }
    let KeyValue;

    if (key2) {
      if (!where[key1]) {
        where[key1] = {};
      }
      if (where[key1][key]) {
        KeyValue = where[key1][key];
      }
      where[key1][key] = { ...KeyValue, ...value };
    } else {
      if (where[key]) {
        KeyValue = where[key];
      }
      where[key] = { ...KeyValue, ...value };
    }
  });

  return where;
};

const generateOrderCondition = (data) => {
  const order = (data || []).map((element) => {
    const { direction, key } = element;

    return [convertSnakeCase(key), direction];
  });

  return order;
};

const convertToSlug = (string) => {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return (
    string
      .toString()
      .toLowerCase()
      // Replace spaces with -
      .replace(/\s+/g, '-')
      // Replace special characters
      .replace(p, (c) => b.charAt(a.indexOf(c)))
      // Replace & with 'and'
      .replace(/&/g, '-and-')
      // Remove all non-word characters
      .replace(/[^\w\-\\]+/g, '')
      // Replace multiple - with single -
      // .replace(/\-\-+/g, '-')
      // Trim - from start of text
      .replace(/^-+/, '')
      // Trim - from end of text
      .replace(/-+$/, '')
  );
};

const generateOtpText = (otp) => `XIFI Tech welcomes you ... Ur One time password is ${otp} - XIFI Tech`;
const generateOTP = () => {
  const digits = '0123456789';

  return Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * 10)]).join('');
};

const generateRandomPassword = () => {
  const password = crypto.randomBytes(3).toString('hex');

  return password;
};

const dateDiff = (date1, date2) => {
  const a = moment(date1);
  const b = moment(date2);

  const days = a.diff(b, 'days');

  return days;
};

const langugeProcessing = (data, languageKey, lang, options) => {
  const processedData = [];

  data.map((eachData, index) => {
    const tempData = eachData;

    if (eachData[languageKey]) {
      eachData[languageKey].map((eachLang, langIndex) => {
        if (eachLang.locale == lang) {
          options.map((eachCopy) => {
            if (eachLang.hasOwnProperty(eachCopy) && eachLang[eachCopy] != '') {
              tempData[eachCopy] = eachLang[eachCopy];
            }
          });
        }
      });
    }
    processedData.push(tempData);
  });

  return processedData;
};

const langugeProcessingSingle = (data, languageKey, lang, options) => {
  const tempData = data;

  if (tempData[languageKey]) {
    tempData[languageKey].map((eachLang, langIndex) => {
      if (eachLang.locale == lang) {
        options.map((eachCopy) => {
          if (eachLang.hasOwnProperty(eachCopy) && eachLang[eachCopy] != '') {
            tempData[eachCopy] = eachLang[eachCopy];
          }
        });
      }
    });
  }

  return tempData;
};

/**
 * Calculate pagination limit and offset from pageSize and pageNumber
 * @param {number|string} pageSize - Number of items per page
 * @param {number|string} pageNumber - Current page number (1-indexed)
 * @returns {Object} Object with limit and offset
 */
const calculatePagination = (pageSize, pageNumber) => {
  const limit = parseInt(pageSize, 10) || 10;
  const offset = limit * ((parseInt(pageNumber, 10) || 1) - 1);

  return { limit, offset };
};

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

/**
 * Execute a function within a database transaction
 * Handles transaction creation, commit, and rollback automatically
 * @param {Object} sequelize - Sequelize instance
 * @param {Function} callback - Async function that receives transaction as parameter
 * @returns {Promise} Result of the callback function
 */
const withTransaction = async (sequelize, callback) => {
  const transaction = await sequelize.transaction();

  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update entity with concurrency stamp validation
 * Common pattern for optimistic locking
 * @param {Object} Model - Sequelize model
 * @param {string} id - Entity ID
 * @param {Object} updateData - Data to update (should include concurrencyStamp and updatedBy)
 * @param {Object} options - Options object with transaction
 * @returns {Promise<Object>} Result object with success status and concurrencyStamp or error
 */
const updateWithConcurrencyStamp = async (Model, id, updateData, options = {}) => {
  const { transaction, ...queryOptions } = options;
  const { concurrencyStamp, updatedBy } = updateData;

  const entity = await Model.findOne({
    where: { id },
    attributes: ['id', 'concurrency_stamp'],
    transaction,
    ...queryOptions,
  });

  if (!entity) {
    return { success: false, error: 'Entity not found' };
  }

  const { concurrency_stamp: stamp } = entity;

  if (concurrencyStamp !== stamp) {
    return { success: false, error: 'invalid concurrency stamp' };
  }

  const { v4: uuidV4 } = require('uuid');
  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(updateData),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  await Model.update(doc, {
    where: { id },
    transaction,
    ...queryOptions,
  });

  return { success: true, concurrencyStamp: newConcurrencyStamp };
};

module.exports = {
  convertCamelObjectToSnake,
  convertCamelToSnake,
  convertSnakeObjectToCamel,
  convertSnakeToCamel,
  convertKababToNormal,
  sanitizeStr,
  postRequest,
  getRequest,
  generateWhereCondition,
  generateOrderCondition,
  convertToSlug,
  generateOtpText,
  generateOTP,
  generateRandomPassword,
  dateDiff,
  langugeProcessing,
  langugeProcessingSingle,
  calculatePagination,
  sendErrorResponse,
  extractErrorMessage,
  handleServerError,
  withTransaction,
  updateWithConcurrencyStamp,
};
