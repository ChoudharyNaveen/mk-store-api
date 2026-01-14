const {
  rider_fcm_token: RiderFcmTokenModel,
  user: UserModel,
  role: RoleModel,
  user_roles_mappings: UserRolesMappingModel,
  sequelize,
  Sequelize: { Op },
} = require('../database');
const { validateFCMToken } = require('../config/firebase');
const {
  ValidationError,
  NotFoundError,
  handleServiceError,
} = require('../utils/serviceErrors');

/**
 * Register or update FCM token for a rider
 * @param {Object} data - Token registration data
 * @param {number} data.userId - User ID
 * @param {string} data.fcmToken - FCM token
 * @param {number} data.vendorId - Vendor ID
 * @param {number} data.branchId - Branch ID (optional)
 * @param {Object} data.deviceInfo - Device information (optional)
 * @returns {Promise<Object>} Created or updated token
 */
const registerFCMToken = async (data) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      userId, fcmToken, vendorId, branchId, deviceInfo = {},
    } = data;

    // Validate FCM token format
    if (!validateFCMToken(fcmToken)) {
      throw new ValidationError('Invalid FCM token format');
    }

    // Verify user exists and is a rider
    const user = await UserModel.findOne({
      where: { id: userId },
      include: [
        {
          model: UserRolesMappingModel,
          as: 'roleMappings',
          where: {
            vendor_id: vendorId,
            status: 'ACTIVE',
          },
          required: true,
          include: [
            {
              model: RoleModel,
              as: 'role',
              where: { name: 'RIDER' },
              attributes: [ 'id', 'name' ],
            },
          ],
        },
      ],
      transaction,
    });

    if (!user) {
      throw new NotFoundError('User not found or is not a rider for this vendor');
    }

    // Check if token already exists for this user
    const existingToken = await RiderFcmTokenModel.findOne({
      where: {
        user_id: userId,
        fcm_token: fcmToken,
      },
      transaction,
    });

    if (existingToken) {
      // Update existing token
      await existingToken.update({
        vendor_id: vendorId,
        branch_id: branchId || null,
        status: 'ACTIVE',
        device_type: deviceInfo.deviceType || null,
        device_id: deviceInfo.deviceId || null,
        last_used_at: new Date(),
      }, { transaction });

      await transaction.commit();

      return { doc: existingToken };
    }

    // Check if user has other active tokens (for same device or different)
    const otherTokens = await RiderFcmTokenModel.findAll({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        fcm_token: { [Op.ne]: fcmToken },
      },
      transaction,
    });

    // Deactivate old tokens if replacing
    if (otherTokens.length > 0) {
      await RiderFcmTokenModel.update(
        { status: 'INACTIVE' },
        {
          where: {
            user_id: userId,
            status: 'ACTIVE',
            fcm_token: { [Op.ne]: fcmToken },
          },
          transaction,
        },
      );
    }

    // Create new token
    const newToken = await RiderFcmTokenModel.create({
      user_id: userId,
      fcm_token: fcmToken,
      vendor_id: vendorId,
      branch_id: branchId || null,
      status: 'ACTIVE',
      device_type: deviceInfo.deviceType || null,
      device_id: deviceInfo.deviceId || null,
      total_orders: 0,
      last_used_at: new Date(),
    }, { transaction });

    await transaction.commit();

    return { doc: newToken };
  } catch (error) {
    await transaction.rollback();

    return handleServiceError(error, 'Failed to register FCM token');
  }
};

/**
 * Get all active FCM tokens for riders in a vendor/branch
 * @param {number} vendorId - Vendor ID
 * @param {number} branchId - Branch ID (optional)
 * @returns {Promise<Object>} Array of active tokens
 */
const getRiderTokens = async (vendorId, branchId = null) => {
  try {
    const where = {
      vendor_id: vendorId,
      status: 'ACTIVE',
    };

    if (branchId) {
      where.branch_id = branchId;
    }

    const tokens = await RiderFcmTokenModel.findAll({
      where,
      attributes: [
        'id',
        'user_id',
        'fcm_token',
        'total_orders',
        'vendor_id',
        'branch_id',
        'status',
        'device_type',
        'device_id',
        'last_used_at',
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
      order: [ [ 'last_used_at', 'DESC' ] ],
    });

    return { doc: tokens };
  } catch (error) {
    return handleServiceError(error, 'Failed to get rider tokens');
  }
};

/**
 * Get FCM token for a specific rider
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token information
 */
const getRiderTokenByUserId = async (userId) => {
  try {
    const token = await RiderFcmTokenModel.findOne({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
      attributes: [
        'id',
        'user_id',
        'fcm_token',
        'total_orders',
        'vendor_id',
        'branch_id',
        'status',
        'device_type',
        'device_id',
        'last_used_at',
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
    });

    if (!token) {
      return { doc: null };
    }

    return { doc: token };
  } catch (error) {
    return handleServiceError(error, 'Failed to get rider token');
  }
};

/**
 * Update token status
 * @param {number} tokenId - Token ID
 * @param {string} status - New status (ACTIVE or INACTIVE)
 * @returns {Promise<Object>} Updated token
 */
const updateTokenStatus = async (tokenId, status) => {
  try {
    if (![ 'ACTIVE', 'INACTIVE' ].includes(status)) {
      throw new ValidationError('Invalid status. Must be ACTIVE or INACTIVE');
    }

    const token = await RiderFcmTokenModel.findOne({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundError('FCM token not found');
    }

    await token.update({ status });

    return { doc: token };
  } catch (error) {
    return handleServiceError(error, 'Failed to update token status');
  }
};

/**
 * Delete (deactivate) FCM token
 * @param {number} tokenId - Token ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteFCMToken = async (tokenId) => {
  try {
    const token = await RiderFcmTokenModel.findOne({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundError('FCM token not found');
    }

    // Soft delete by setting status to INACTIVE
    await token.update({ status: 'INACTIVE' });

    return { doc: { message: 'FCM token deactivated successfully' } };
  } catch (error) {
    return handleServiceError(error, 'Failed to delete FCM token');
  }
};

/**
 * Increment total orders counter for a rider
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated token
 */
const incrementTotalOrders = async (userId) => {
  try {
    const token = await RiderFcmTokenModel.findOne({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
    });

    if (!token) {
      // Token might not exist, that's okay
      return { doc: null };
    }

    await token.increment('total_orders');

    return { doc: token };
  } catch (error) {
    return handleServiceError(error, 'Failed to increment total orders');
  }
};

module.exports = {
  registerFCMToken,
  getRiderTokens,
  getRiderTokenByUserId,
  updateTokenStatus,
  deleteFCMToken,
  incrementTotalOrders,
};
