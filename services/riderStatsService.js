const {
  rider_stats: RiderStatsModel,
  user: UserModel,
  vendor: VendorModel,
  sequelize,
} = require('../database');
const {
  handleServiceError,
} = require('../utils/serviceErrors');

/**
 * Get rider statistics
 * @param {number} userId - User ID
 * @param {number} vendorId - Vendor ID
 * @returns {Promise<Object>} Rider statistics
 */
const getRiderStats = async (userId, vendorId) => {
  try {
    const where = {
      user_id: userId,
      vendor_id: vendorId,
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
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [ 'id', 'name', 'mobile_number', 'email' ],
        },
        {
          model: VendorModel,
          as: 'vendor',
          attributes: [ 'id', 'name' ],
        },
      ],
    });

    if (!stats) {
      return { doc: null };
    }

    return { doc: stats };
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
