const {
  rider_stats: RiderStatsModel,
  user: UserModel,
  order: OrderModel,
  sequelize,
  Sequelize: {
    Op,
    fn,
    col,
  },
} = require('../database');
const {
  handleServiceError,
} = require('../utils/serviceErrors');
const { PAYMENT_STATUS } = require('../utils/constants/paymentStatusConstants');
const { ORDER_STATUS } = require('../utils/constants/orderStatusConstants');

/**
 * Get rider statistics
 * @param {number} userId - User ID
 * @param {string|Date} [startDate] - Optional start date (inclusive, by created_at)
 * @param {string|Date} [endDate] - Optional end date (inclusive, by created_at)
 * @returns {Promise<Object>} Rider statistics with optional revenue stats
 */
const getRiderStats = async (userId, startDate, endDate) => {
  try {
    const where = {
      user_id: userId,
    };

    const stats = await RiderStatsModel.findOne({
      where,
      attributes: [
        'id',
        'user_id',
        'vendor_id',
        'total_orders',
        'total_deliveries',
        'completed_orders',
        'cancelled_orders',
        'rating',
        'created_at',
        'updated_at',
      ],
    });

    // Compute revenue/order stats for this rider (DELIVERED & PAID orders)
    const orderWhere = {
      rider_id: userId,
      status: ORDER_STATUS.DELIVERED,
      payment_status: PAYMENT_STATUS.PAID,
    };

    if (startDate && endDate) {
      orderWhere[Op.and] = [
        sequelize.where(fn('DATE', col('created_at')), { [Op.gte]: startDate }),
        sequelize.where(fn('DATE', col('created_at')), { [Op.lte]: endDate }),
      ];
    }

    const totals = await OrderModel.findOne({
      where: orderWhere,
      attributes: [
        [ fn('COUNT', col('id')), 'total_orders' ],
        [ fn('COALESCE', fn('SUM', col('final_amount')), 0), 'total_amount' ],
      ],
      raw: true,
    });

    const totalOrders = totals ? Number(totals.total_orders) : 0;
    const totalAmount = totals ? parseFloat(parseFloat(totals.total_amount).toFixed(2)) : 0;

    const revenueStats = {
      total_orders: totalOrders,
      total_revenue: totalAmount,
      has_date_filter: !!(startDate && endDate),
      start_date: startDate || null,
      end_date: endDate || null,
    };

    if (!stats) {
      return { doc: { revenueStats } };
    }

    const statsData = stats.get({ plain: true });

    return { doc: { ...statsData, revenueStats } };
  } catch (error) {
    return handleServiceError(error, 'Failed to get rider stats');
  }
};

/**
 * Increment total orders counter for a rider
 * @param {number} userId - User ID
 * @param {number} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated stats
 */
const incrementTotalOrders = async (userId, vendorId) => {
  const transaction = await sequelize.transaction();

  try {
    const where = {
      user_id: userId,
      vendor_id: vendorId,
    };

    let stats = await RiderStatsModel.findOne({
      where,
      transaction,
    });

    if (!stats) {
      // Create new stats entry if it doesn't exist
      stats = await RiderStatsModel.create({
        user_id: userId,
        vendor_id: vendorId,
        total_orders: 1,
        total_deliveries: 0,
        completed_orders: 0,
        cancelled_orders: 0,
      }, { transaction });
    } else {
      await stats.increment('total_orders', { transaction });
    }

    await transaction.commit();

    return { doc: stats };
  } catch (error) {
    await transaction.rollback();

    return handleServiceError(error, 'Failed to increment total orders');
  }
};

/**
 * Increment total deliveries counter for a rider
 * @param {number} userId - User ID
 * @param {number} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated stats
 */
const incrementTotalDeliveries = async (userId, vendorId) => {
  const transaction = await sequelize.transaction();

  try {
    const where = {
      user_id: userId,
      vendor_id: vendorId,
    };

    let stats = await RiderStatsModel.findOne({
      where,
      transaction,
    });

    if (!stats) {
      // Create new stats entry if it doesn't exist
      stats = await RiderStatsModel.create({
        user_id: userId,
        vendor_id: vendorId,
        total_orders: 0,
        total_deliveries: 1,
        completed_orders: 0,
        cancelled_orders: 0,
      }, { transaction });
    } else {
      await stats.increment('total_deliveries', { transaction });
    }

    await transaction.commit();

    return { doc: stats };
  } catch (error) {
    await transaction.rollback();

    return handleServiceError(error, 'Failed to increment total deliveries');
  }
};

/**
 * Update multiple rider statistics
 * @param {number} userId - User ID
 * @param {number} vendorId - Vendor ID
 * @param {Object} statsData - Statistics to update
 * @returns {Promise<Object>} Updated stats
 */
const updateRiderStats = async (userId, vendorId, statsData) => {
  const transaction = await sequelize.transaction();

  try {
    const where = {
      user_id: userId,
      vendor_id: vendorId,
    };

    let stats = await RiderStatsModel.findOne({
      where,
      transaction,
    });

    if (!stats) {
      // Create new stats entry if it doesn't exist
      stats = await RiderStatsModel.create({
        user_id: userId,
        vendor_id: vendorId,
        total_orders: statsData.total_orders || 0,
        total_deliveries: statsData.total_deliveries || 0,
        completed_orders: statsData.completed_orders || 0,
        cancelled_orders: statsData.cancelled_orders || 0,
        rating: statsData.rating || null,
      }, { transaction });
    } else {
      await stats.update(statsData, { transaction });
    }

    await transaction.commit();

    return { doc: stats };
  } catch (error) {
    await transaction.rollback();

    return handleServiceError(error, 'Failed to update rider stats');
  }
};

/**
 * Get all riders for a vendor
 * @param {number} vendorId - Vendor ID
 * @returns {Promise<Object>} Array of riders with stats
 */
const getRidersByVendor = async (vendorId) => {
  try {
    const where = {
      vendor_id: vendorId,
    };

    const riders = await RiderStatsModel.findAll({
      where,
      attributes: [
        'id',
        'user_id',
        'vendor_id',
        'total_orders',
        'total_deliveries',
        'completed_orders',
        'cancelled_orders',
        'rating',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'mobile_number', 'email' ],
        },
      ],
      order: [ [ 'total_orders', 'DESC' ] ],
    });

    return { doc: riders };
  } catch (error) {
    return handleServiceError(error, 'Failed to get riders by vendor');
  }
};

module.exports = {
  getRiderStats,
  incrementTotalOrders,
  incrementTotalDeliveries,
  updateRiderStats,
  getRidersByVendor,
};
