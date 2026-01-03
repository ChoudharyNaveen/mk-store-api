/* eslint-disable */
const convertCamelCase = require('lodash.camelcase');
const convertSnakeCase = require('lodash.snakecase');
const moment = require('moment');
const axios = require('axios');
const crypto = require('crypto');

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

module.exports = {
  convertCamelObjectToSnake,
  convertCamelToSnake,
  convertSnakeObjectToCamel,
  convertSnakeToCamel,
  convertKababToNormal,
  sanitizeStr,
  postRequest,
  getRequest,
  convertToSlug,
  generateOtpText,
  generateOTP,
  generateRandomPassword,
  dateDiff,
  langugeProcessing,
  langugeProcessingSingle,
  // Export convertSnakeCase for use in databaseHelpers
  convertSnakeCase,
};

