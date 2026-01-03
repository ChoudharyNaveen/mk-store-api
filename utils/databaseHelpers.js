/* eslint-disable */
const { fn, col, where: sequelizeWhere } = require('sequelize');
const {
  Sequelize: { Op },
  sequelize,
} = require('../database');
const { convertSnakeCase } = require('./utility');

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
  const { convertCamelToSnake } = require('./utility');
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

/**
 * Get paginated results with both filtered count and total count
 * Performs findAndCountAll for filtered results and a separate count query for total records
 * Uses the same queryOptions for total count (excluding limit and offset)
 * Optimizes by skipping total count query if pageNumber > 1 (pagination already enabled)
 * @param {Object} Model - Sequelize model
 * @param {Object} queryOptions - Query options for findAndCountAll (where, include, order, limit, offset, attributes, distinct, etc.)
 * @param {number|string} pageNumber - Current page number (1-indexed). If > 1, total count query is skipped
 * @returns {Promise<Object>} Object with count (filtered), totalCount (total records), and rows
 */
const findAndCountAllWithTotal = async (Model, queryOptions = {}, pageNumber = 1) => {
  try {
    const pageNum = Number(pageNumber) || 1;
    // Build total count query options - use same options but exclude limit and offset
    const { limit, offset, order, attributes, ...totalCountQueryOptions } = queryOptions;

    const promises = [
      Model.findAndCountAll(queryOptions),
    ]
    if (pageNum <= 1) {
      promises.push(Model.count(queryOptions));
    }

    const response = await Promise.all(promises);
    const rows = response[0];
    const count = response[1];
    // If pageNumber > 1, pagination is already enabled, so skip total count query for performance
    if (pageNum > 1) {
      return {
        count: rows.count, // Filtered count
        totalCount: null, // Not needed when pageNumber > 1
        rows: rows.rows,
      };
    }

    return {
      count: rows.rows, // Filtered count
      totalCount: count, // Total count of all records matching the same conditions
      rows: rows.rows,
    };
  } catch (error) {
    console.error('Error in findAndCountAllWithTotal:', error);
    throw error;
  }
};

/**
 * Execute raw MySQL query and return results in same format as findAndCountAllWithTotal
 * @param {string} query - Main SELECT query with LIMIT and OFFSET
 * @param {string} countQuery - COUNT query for filtered results (same WHERE conditions)
 * @param {number} pageNumber - Current page number (1-indexed)
 * @param {Array} replacements - Query parameter replacements (optional)
 * @returns {Promise<Object>} Object with count, totalCount, and rows
 */
const findAndCountAllWithTotalQuery = async (query, countQuery, pageNumber = 1, replacements = []) => {
  try {
    const pageNum = Number(pageNumber) || 1;

    // Create promise array and conditionally push queries
    const promises = [
      sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      }),
    ];

    // Count query should be called only when pageNum <= 1
    if (pageNum <= 1) {
      promises.push(
        sequelize.query(countQuery, {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }),
      );
    }

    const results = await Promise.all(promises);
    const rows = results[0];

    // If pageNumber > 1, pagination is already enabled
    if (pageNum > 1) {
      return {
        count: 0, // Count not needed when pageNumber > 1
        totalCount: null, // Not needed when pageNumber > 1
        rows,
      };
    }

    // When pageNum <= 1, we have countQuery result
    const countResult = results[1] || [];
    const count = countResult[0]?.count || 0;

    return {
      count, // Filtered count
      totalCount: count, // Total count (same as filtered count)
      rows,
    };
  } catch (error) {
    console.error('Error in findAndCountAllWithTotalQuery:', error);
    throw error;
  }
};

/**
 * Create pagination object with dynamic paginationEnabled flag
 * paginationEnabled is true only if totalCount is greater than pageSize
 * If totalCount is null (when pageNumber > 1), paginationEnabled defaults to true
 * @param {number|string} pageSize - Number of items per page
 * @param {number|string} pageNumber - Current page number (1-indexed)
 * @param {number|null} totalCount - Total count of records (null when pageNumber > 1)
 * @returns {Object} Pagination object with pageSize, pageNumber, totalCount, and paginationEnabled
 */
const createPaginationObject = (pageSize, pageNumber, totalCount) => {
  const pageSizeNum = Number(pageSize) || 10;
  const pageNum = Number(pageNumber) || 1;
  const totalCountNum = totalCount !== null && totalCount !== undefined ? totalCount : null;

  // If totalCount is null (pageNumber > 1), pagination is already enabled
  // Otherwise, check if totalCount > pageSize
  const paginationEnabled = totalCountNum === null
    ? true
    : totalCountNum > pageSizeNum;

  return {
    pageSize: pageSizeNum,
    pageNumber: pageNum,
    totalCount: totalCountNum,
    paginationEnabled,
  };
};

module.exports = {
  generateWhereCondition,
  generateOrderCondition,
  calculatePagination,
  withTransaction,
  updateWithConcurrencyStamp,
  findAndCountAllWithTotal,
  findAndCountAllWithTotalQuery,
  createPaginationObject,
};

