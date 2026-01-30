/* eslint-disable max-lines */
const { Op } = require('sequelize');
const {
  user: UserModel,
  order: OrderModel,
  sequelize,
} = require('../database');
const { ORDER_STATUS } = require('../utils/constants/orderStatusConstants');
const { REFUND_STATUS } = require('../utils/constants/refundStatusConstants');
const { handleServiceError } = require('../utils/serviceErrors');
const {
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  extractILikeConditions,
  whereConditionsToSQL,
  findAndCountAllWithTotalQuery,
} = require('../utils/helper');
const { convertSnakeCase } = require('../utils/utility');

/**
 * Get Dashboard KPIs with percentage changes
 * Returns: Total Users, Total Orders, Revenue, Total Returns with trends
 */
const getDashboardKPIs = async (payload = {}) => {
  try {
    const { vendorId, branchId } = payload;

    // Build where conditions for vendor/branch filtering
    const orderWhere = {};

    if (vendorId) orderWhere.vendor_id = vendorId;
    if (branchId) orderWhere.branch_id = branchId;
    // Get current stats and previous period stats in parallel
    const [ currentStats, yesterdayStats, lastWeekStats ] = await Promise.all([
      // Current stats
      Promise.all([
        // Total Users (only users with role = 'USER')
        (async () => {
          const replacements = [];
          let vendorCondition = '';
          let branchJoin = '';
          let branchCondition = '';

          if (vendorId) {
            vendorCondition = 'AND user_roles_mappings.vendor_id = ?';
            replacements.push(vendorId);
          }
          if (branchId) {
            // Filter users who have placed orders at this branch
            branchJoin = 'INNER JOIN `order` ON user.id = `order`.created_by';
            branchCondition = 'AND `order`.branch_id = ?';
            replacements.push(branchId);
          }

          const userCountQuery = `
            SELECT COUNT(DISTINCT user.id) as total_users
            FROM user
            INNER JOIN user_roles_mappings ON user.id = user_roles_mappings.user_id
            INNER JOIN role ON user_roles_mappings.role_id = role.id
            ${branchJoin}
            WHERE role.name = 'USER'
              AND user_roles_mappings.status = 'ACTIVE'
              ${vendorCondition}
              ${branchCondition}
          `;
          const result = await sequelize.query(userCountQuery, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
          });

          return result[0]?.total_users || 0;
        })(),
        // Total Orders
        OrderModel.count({ where: orderWhere }),
        // Total Revenue (from delivered orders)
        (async () => {
          const orderTable = '`order`';
          const revenueQuery = `
            SELECT COALESCE(SUM(${orderTable}.final_amount), 0) as total_revenue
            FROM ${orderTable}
            WHERE ${orderTable}.status = ?
              ${vendorId ? `AND ${orderTable}.vendor_id = ?` : ''}
              ${branchId ? `AND ${orderTable}.branch_id = ?` : ''}
          `;
          const replacements = [ ORDER_STATUS.DELIVERED ];

          if (vendorId) replacements.push(vendorId);
          if (branchId) replacements.push(branchId);
          const result = await sequelize.query(revenueQuery, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
          });

          return result[0]?.total_revenue || 0;
        })(),
        // Total Returns
        OrderModel.count({
          where: {
            ...orderWhere,
            refund_status: { [Op.ne]: REFUND_STATUS.NONE },
          },
        }),
      ]),

      // Yesterday stats (for percentage calculation)
      Promise.all([
        (async () => {
          const yesterdayEnd = new Date();

          yesterdayEnd.setHours(0, 0, 0, 0);
          const replacements = [ yesterdayEnd ];
          let vendorCondition = '';
          let branchJoin = '';
          let branchCondition = '';

          if (vendorId) {
            vendorCondition = 'AND user_roles_mappings.vendor_id = ?';
            replacements.push(vendorId);
          }
          if (branchId) {
            // Filter users who have placed orders at this branch
            branchJoin = 'INNER JOIN `order` ON user.id = `order`.created_by';
            branchCondition = 'AND `order`.branch_id = ?';
            replacements.push(branchId);
          }

          const userCountQuery = `
            SELECT COUNT(DISTINCT user.id) as total_users
            FROM user
            INNER JOIN user_roles_mappings ON user.id = user_roles_mappings.user_id
            INNER JOIN role ON user_roles_mappings.role_id = role.id
            ${branchJoin}
            WHERE role.name = 'USER'
              AND user_roles_mappings.status = 'ACTIVE'
              AND user.created_at < ?
              ${vendorCondition}
              ${branchCondition}
          `;
          const result = await sequelize.query(userCountQuery, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
          });

          return result[0]?.total_users || 0;
        })(),
        OrderModel.count({
          where: {
            ...orderWhere,
            created_at: {
              [Op.lt]: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        (async () => {
          const yesterdayStart = new Date();

          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          yesterdayStart.setHours(0, 0, 0, 0);
          const yesterdayEnd = new Date(yesterdayStart);

          yesterdayEnd.setHours(23, 59, 59, 999);

          const orderTable = '`order`';
          const revenueQuery = `
            SELECT COALESCE(SUM(${orderTable}.final_amount), 0) as total_revenue
            FROM ${orderTable}
            WHERE ${orderTable}.status = ?
              AND ${orderTable}.created_at >= ? AND ${orderTable}.created_at <= ?
              ${vendorId ? `AND ${orderTable}.vendor_id = ?` : ''}
              ${branchId ? `AND ${orderTable}.branch_id = ?` : ''}
          `;
          const replacements = [ ORDER_STATUS.DELIVERED, yesterdayStart, yesterdayEnd ];

          if (vendorId) replacements.push(vendorId);
          if (branchId) replacements.push(branchId);
          const result = await sequelize.query(revenueQuery, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
          });

          return result[0]?.total_revenue || 0;
        })(),
        OrderModel.count({
          where: {
            ...orderWhere,
            refund_status: { [Op.ne]: REFUND_STATUS.NONE },
            created_at: {
              [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 1)),
              [Op.lt]: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]),

      // Last week stats (for orders percentage)
      OrderModel.count({
        where: {
          ...orderWhere,
          created_at: {
            [Op.lt]: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
    ]);

    const [ totalUsers, totalOrders, totalRevenue, totalReturns ] = currentStats;
    const [ yesterdayUsers, yesterdayRevenue, yesterdayReturns ] = yesterdayStats;
    const lastWeekOrders = lastWeekStats;

    // Calculate percentage changes
    const calculatePercentage = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      const percentage = ((current - previous) / previous) * 100;

      return parseFloat(percentage.toFixed(1));
    };

    return {
      doc: {
        total_users: {
          value: totalUsers,
          change: calculatePercentage(totalUsers, yesterdayUsers),
          change_type: totalUsers >= yesterdayUsers ? 'up' : 'down',
          period: 'yesterday',
        },
        total_orders: {
          value: totalOrders,
          change: calculatePercentage(totalOrders, lastWeekOrders),
          change_type: totalOrders >= lastWeekOrders ? 'up' : 'down',
          period: 'past week',
        },
        revenue: {
          value: totalRevenue,
          change: calculatePercentage(totalRevenue, yesterdayRevenue),
          change_type: totalRevenue >= yesterdayRevenue ? 'up' : 'down',
          period: 'yesterday',
        },
        total_returns: {
          value: totalReturns,
          change: calculatePercentage(totalReturns, yesterdayReturns),
          change_type: totalReturns >= yesterdayReturns ? 'up' : 'down',
          period: 'yesterday',
        },
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch dashboard KPIs');
  }
};

/**
 * Get Top Products - Top 5 products with revenue, orders, and trend
 */
const getTopProducts = async (payload = {}) => {
  try {
    const {
      vendorId, branchId, limit = 5, startDate, endDate,
    } = payload;

    const replacements = [ ORDER_STATUS.DELIVERED ];
    let whereClause = 'WHERE `order`.status = ?';
    let currentDateCondition = '';
    let previousDateCondition = '';

    // Build date conditions for current period
    if (startDate || endDate) {
      if (startDate && endDate) {
        const endDateTime = new Date(endDate);

        endDateTime.setHours(23, 59, 59, 999);
        currentDateCondition = 'AND orderitem.created_at >= ? AND orderitem.created_at <= ?';
        replacements.push(new Date(startDate), endDateTime);
      } else if (startDate) {
        currentDateCondition = 'AND orderitem.created_at >= ?';
        replacements.push(new Date(startDate));
      } else if (endDate) {
        const endDateTime = new Date(endDate);

        endDateTime.setHours(23, 59, 59, 999);
        currentDateCondition = 'AND orderitem.created_at <= ?';
        replacements.push(endDateTime);
      }
      // For previous period, calculate based on date range duration
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationMs = end - start;
        const previousEnd = new Date(start);

        previousEnd.setTime(start.getTime() - 1);
        const previousStart = new Date(previousEnd);

        previousStart.setTime(previousEnd.getTime() - durationMs);
        previousDateCondition = 'AND orderitem.created_at >= ? AND orderitem.created_at <= ?';
        replacements.push(previousStart, previousEnd);
      }
    } else {
      // Default: last 30 days
      currentDateCondition = 'AND orderitem.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      previousDateCondition = 'AND orderitem.created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND orderitem.created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    if (vendorId) {
      whereClause += ' AND `order`.vendor_id = ?';
      replacements.push(vendorId);
    }
    if (branchId) {
      whereClause += ' AND `order`.branch_id = ?';
      replacements.push(branchId);
    }

    // Get current period stats
    const currentPeriodQuery = `
      SELECT 
        product.id,
        product.title as product_name,
        COALESCE(SUM(orderitem.quantity * orderitem.price_at_purchase), 0) as revenue,
        COUNT(DISTINCT orderitem.order_id) as orders
      FROM orderitem
      INNER JOIN product ON orderitem.product_id = product.id
      INNER JOIN \`order\` ON orderitem.order_id = \`order\`.id
      ${whereClause}
        ${currentDateCondition}
      GROUP BY product.id, product.title
      ORDER BY revenue DESC
      LIMIT ?
    `;

    // Get previous period stats for trend calculation
    const previousPeriodQuery = `
      SELECT 
        product.id,
        COALESCE(SUM(orderitem.quantity * orderitem.price_at_purchase), 0) as revenue,
        COUNT(DISTINCT orderitem.order_id) as orders
      FROM orderitem
      INNER JOIN product ON orderitem.product_id = product.id
      INNER JOIN \`order\` ON orderitem.order_id = \`order\`.id
      ${whereClause}
        ${previousDateCondition}
      GROUP BY product.id
    `;

    const currentReplacements = [ ...replacements, limit ];
    const previousReplacements = [ ...replacements ];

    const [ currentResults, previousResults ] = await Promise.all([
      sequelize.query(currentPeriodQuery, {
        replacements: currentReplacements,
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(previousPeriodQuery, {
        replacements: previousReplacements,
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    // Create a map of previous period stats
    const previousMap = {};

    previousResults.forEach((row) => {
      previousMap[row.id] = {
        revenue: parseFloat(row.revenue) || 0,
        orders: parseInt(row.orders) || 0,
      };
    });

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      const percentage = ((current - previous) / previous) * 100;

      return parseFloat(percentage.toFixed(1));
    };

    const doc = currentResults.map((row, index) => {
      const previous = previousMap[row.id] || { revenue: 0, orders: 0 };
      const currentRevenue = parseFloat(row.revenue) || 0;
      const trend = calculateTrend(currentRevenue, previous.revenue);

      return {
        rank: index + 1,
        product_id: row.id,
        product_name: row.product_name,
        revenue: currentRevenue,
        orders: parseInt(row.orders) || 0,
        trend,
        trend_type: trend >= 0 ? 'up' : 'down',
      };
    });

    return { doc };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch top products');
  }
};

/**
 * Get Recent Orders - Recent 5 orders with status, customer, time, price
 */
const getRecentOrders = async (payload = {}) => {
  try {
    const {
      vendorId, branchId, limit = 5, startDate, endDate,
    } = payload;

    const where = {};

    if (vendorId) where.vendor_id = vendorId;
    if (branchId) where.branch_id = branchId;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);

        endDateTime.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = endDateTime;
      }
    }

    const orders = await OrderModel.findAll({
      where,
      attributes: [
        'id',
        'order_number',
        'status',
        'final_amount',
        'created_at',
      ],
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'email', 'mobile_number' ],
          required: false,
        },
      ],
      order: [ [ 'created_at', 'DESC' ] ],
      limit,
    });

    const doc = orders.map((order) => {
      const orderData = order.toJSON();
      const createdAt = new Date(orderData.created_at);
      const now = new Date();
      const diffMs = now - createdAt;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      let timeAgo = '';

      if (diffMins < 60) {
        timeAgo = `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);

        timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      }

      return {
        order_id: orderData.id,
        order_number: orderData.order_number,
        status: orderData.status,
        customer_name: orderData.user?.name || 'N/A',
        customer_email: orderData.user?.email || null,
        customer_mobile: orderData.user?.mobile_number || null,
        price: parseFloat(orderData.final_amount) || 0,
        time_ago: timeAgo,
        created_at: orderData.created_at,
      };
    });

    return { doc };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch recent orders');
  }
};

/**
 * Get Expiring Products - Product variants that are expiring soon or expired
 * Follows same pagination logic as getSubCategory
 */
const getExpiringProducts = async (payload = {}) => {
  try {
    const {
      pageSize, pageNumber, filters, sorting, vendorId, branchId, daysAhead = 30,
    } = payload;
    const { limit, offset } = calculatePagination(pageSize, pageNumber);

    // Extract iLike conditions from filters
    const { processedFilters, iLikeConditions } = extractILikeConditions(filters || []);

    const order = sorting
      ? generateOrderCondition(sorting)
      : [ [ 'expiry_date', 'ASC' ] ]; // Default: sort by expiry date ascending

    // Build WHERE clause from filters with qualified column names and iLike conditions
    const replacements = [];
    let baseWhereClause = 'WHERE product_variant.status = \'ACTIVE\' AND product.status = \'ACTIVE\'';

    // Add expiry date filter - show products expiring within daysAhead days or already expired
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);

    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    baseWhereClause += ' AND product_variant.expiry_date <= ?';
    replacements.push(futureDate);

    // Add vendor/branch filters
    if (vendorId) {
      baseWhereClause += ' AND product.vendor_id = ?';
      replacements.push(vendorId);
    }
    if (branchId) {
      baseWhereClause += ' AND product.branch_id = ?';
      replacements.push(branchId);
    }

    // Map column names to their correct table prefixes
    // Columns that belong to product table
    const productTableColumns = [ 'vendor_id', 'branch_id', 'product_id', 'product_name', 'productName' ];
    // Columns that belong to category table
    const categoryTableColumns = [ 'category_id', 'category_name', 'category' ];

    // Separate filters by table
    const variantFilters = [];
    const productFilters = [];
    const categoryFilters = [];
    const variantILikeConditions = [];
    const productILikeConditions = [];
    const categoryILikeConditions = [];

    // Process filters and iLike conditions
    if (processedFilters && processedFilters.length > 0) {
      processedFilters.forEach((filter) => {
        const { key } = filter;
        const snakeKey = convertSnakeCase(key);

        // Check both original and snake_case versions
        if (productTableColumns.includes(key) || productTableColumns.includes(snakeKey)) {
          // Map product_name/productName to title for product table
          const mappedFilter = { ...filter };

          if (key === 'product_name' || key === 'productName' || snakeKey === 'product_name') {
            mappedFilter.key = 'title';
          }
          productFilters.push(mappedFilter);
        } else if (categoryTableColumns.includes(key) || categoryTableColumns.includes(snakeKey)) {
          // Map category_name/category to title for category table
          const mappedFilter = { ...filter };

          if (key === 'category_name' || key === 'category' || snakeKey === 'category_name') {
            mappedFilter.key = 'title';
          }
          categoryFilters.push(mappedFilter);
        } else {
          variantFilters.push(filter);
        }
      });
    }

    // Process iLike conditions
    if (iLikeConditions && iLikeConditions.length > 0) {
      iLikeConditions.forEach((iLikeCond) => {
        const key = iLikeCond.column;
        const snakeKey = convertSnakeCase(key);

        // Check both original and snake_case versions
        if (productTableColumns.includes(key) || productTableColumns.includes(snakeKey)) {
          // Map product_name/productName to title for product table
          const mappedCondition = { ...iLikeCond };

          if (key === 'product_name' || key === 'productName' || snakeKey === 'product_name') {
            mappedCondition.column = 'title';
          }
          productILikeConditions.push(mappedCondition);
        } else if (categoryTableColumns.includes(key) || categoryTableColumns.includes(snakeKey)) {
          // Map category_name/category to title for category table
          const mappedCondition = { ...iLikeCond };

          if (key === 'category_name' || key === 'category' || snakeKey === 'category_name') {
            mappedCondition.column = 'title';
          }
          categoryILikeConditions.push(mappedCondition);
        } else {
          variantILikeConditions.push(iLikeCond);
        }
      });
    }

    // Generate WHERE clauses for each table
    const variantWhere = variantFilters.length > 0 ? generateWhereCondition(variantFilters) : {};
    const productWhere = productFilters.length > 0 ? generateWhereCondition(productFilters) : {};
    const categoryWhere = categoryFilters.length > 0 ? generateWhereCondition(categoryFilters) : {};

    const variantWhereClause = Object.keys(variantWhere).length > 0
      ? whereConditionsToSQL(variantWhere, 'product_variant', replacements, variantILikeConditions)
      : '';
    const productWhereClause = Object.keys(productWhere).length > 0
      ? whereConditionsToSQL(productWhere, 'product', replacements, productILikeConditions)
      : '';
    const categoryWhereClause = Object.keys(categoryWhere).length > 0
      ? whereConditionsToSQL(categoryWhere, 'category', replacements, categoryILikeConditions)
      : '';

    // Combine all WHERE clauses
    const additionalConditions = [
      variantWhereClause,
      productWhereClause,
      categoryWhereClause,
    ].filter(Boolean);

    const whereSQL = additionalConditions.length > 0
      ? `${baseWhereClause} AND ${additionalConditions.join(' AND ')}`
      : baseWhereClause;

    // Build ORDER BY clause
    let orderClause = '';

    if (order && order.length > 0) {
      const orderParts = order.map(([ col, dir ]) => {
        // Map common column names
        if (col === 'expiry_date' || col === 'expiryDate') {
          return `product_variant.expiry_date ${dir}`;
        }
        if (col === 'product_name' || col === 'productName') {
          return `product.title ${dir}`;
        }
        if (col === 'variant_name' || col === 'variantName') {
          return `product_variant.variant_name ${dir}`;
        }
        if (col === 'category' || col === 'category_name') {
          return `category.title ${dir}`;
        }
        if (col === 'stock' || col === 'quantity') {
          return `product_variant.quantity ${dir}`;
        }
        if (col === 'price' || col === 'selling_price') {
          return `product_variant.selling_price ${dir}`;
        }

        return `product_variant.${col} ${dir}`;
      });

      orderClause = `ORDER BY ${orderParts.join(', ')}`;
    } else {
      orderClause = 'ORDER BY product_variant.expiry_date ASC';
    }

    // Build SELECT query with JOINs
    const selectQuery = `
      SELECT 
        product_variant.id as variant_id,
        product_variant.variant_name,
        product_variant.quantity as stock,
        product_variant.selling_price as price,
        product_variant.expiry_date,
        product.id as product_id,
        product.title as product_name,
        category.id as category_id,
        category.title as category_name
      FROM product_variant
      INNER JOIN product ON product_variant.product_id = product.id
      INNER JOIN category ON product.category_id = category.id
      ${whereSQL}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    // Build COUNT query
    const countQuery = `
      SELECT COUNT(*) as count
      FROM product_variant
      INNER JOIN product ON product_variant.product_id = product.id
      INNER JOIN category ON product.category_id = category.id
      ${whereSQL}
    `;

    replacements.push(limit, offset);

    const response = await findAndCountAllWithTotalQuery(
      selectQuery,
      countQuery,
      pageNumber,
      replacements,
    );

    let doc = [];

    if (response) {
      const { count, totalCount, rows } = response;

      // Calculate expiry status for each variant (reuse today from start of function)
      const items = rows.map((row) => {
        const expiryDate = new Date(row.expiry_date);

        expiryDate.setHours(0, 0, 0, 0);
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let expiryStatus = '';
        let expiryStatusType = '';

        if (diffDays < 0) {
          // Expired
          const daysAgo = Math.abs(diffDays);

          expiryStatus = `Expired ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
          expiryStatusType = 'expired';
        } else if (diffDays === 0) {
          // Expires today
          expiryStatus = 'Expires today';
          expiryStatusType = 'expiring_today';
        } else {
          // Expiring soon
          expiryStatus = `Expires in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
          expiryStatusType = 'expiring_soon';
        }

        // Format expiry date
        const formattedExpiryDate = expiryDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        return {
          variant_id: row.variant_id,
          variant_name: row.variant_name,
          product_id: row.product_id,
          product_name: row.product_name,
          category_id: row.category_id,
          category_name: row.category_name,
          stock: parseInt(row.stock) || 0,
          price: parseFloat(row.price) || 0,
          expiry_date: row.expiry_date,
          expiry_date_formatted: formattedExpiryDate,
          expiry_status: expiryStatus,
          expiry_status_type: expiryStatusType,
          days_until_expiry: diffDays,
        };
      });

      doc = items;

      return { count, totalCount, doc };
    }

    return { count: 0, totalCount: 0, doc: [] };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch expiring products');
  }
};

module.exports = {
  getDashboardKPIs,
  getTopProducts,
  getRecentOrders,
  getExpiringProducts,
};
