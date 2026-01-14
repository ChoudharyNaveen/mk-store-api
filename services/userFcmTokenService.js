const {
  user_fcm_token: UserFcmTokenModel,
  user: UserModel,
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
 * Register or update FCM token for a user
 * @param {Object} data - Token registration data
 * @param {number} data.userId - User ID
 * @param {string} data.fcmToken - FCM token
 * @param {Object} data.deviceInfo - Device information (optional)
 * @returns {Promise<Object>} Created or updated token
 */
const registerFCMToken = async (data) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      userId, fcmToken, deviceInfo = {},
    } = data;

    // Validate FCM token format
    if (!validateFCMToken(fcmToken)) {
      throw new ValidationError('Invalid FCM token format');
    }

    // Verify user exists
    const user = await UserModel.findOne({
      where: { id: userId },
      attributes: [ 'id' ],
      transaction,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if token already exists for this user
    const existingToken = await UserFcmTokenModel.findOne({
      where: {
        user_id: userId,
        fcm_token: fcmToken,
      },
      transaction,
    });

    if (existingToken) {
      // Update existing token
      await existingToken.update({
        status: 'ACTIVE',
        device_type: deviceInfo.deviceType || null,
        device_id: deviceInfo.deviceId || null,
        last_used_at: new Date(),
      }, { transaction });

      await transaction.commit();

      return { doc: existingToken };
    }

    // Check if user has other active tokens (for same device or different)
    const otherTokens = await UserFcmTokenModel.findAll({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        fcm_token: { [Op.ne]: fcmToken },
      },
      transaction,
    });

    // Deactivate old tokens if replacing
    if (otherTokens.length > 0) {
      await UserFcmTokenModel.update(
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
    const newToken = await UserFcmTokenModel.create({
      user_id: userId,
      fcm_token: fcmToken,
      status: 'ACTIVE',
      device_type: deviceInfo.deviceType || null,
      device_id: deviceInfo.deviceId || null,
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
 * Get all active FCM tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Array of active tokens
 */
const getUserTokens = async (userId) => {
  try {
    const tokens = await UserFcmTokenModel.findAll({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
      attributes: [
        'id',
        'user_id',
        'fcm_token',
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
    return handleServiceError(error, 'Failed to get user tokens');
  }
};

/**
 * Get FCM token for a specific user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token information
 */
const getFCMTokenByUserId = async (userId) => {
  try {
    const token = await UserFcmTokenModel.findOne({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
      attributes: [
        'id',
        'user_id',
        'fcm_token',
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
    return handleServiceError(error, 'Failed to get FCM token');
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

    const token = await UserFcmTokenModel.findOne({
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
    const token = await UserFcmTokenModel.findOne({
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

module.exports = {
  registerFCMToken,
  getUserTokens,
  getFCMTokenByUserId,
  updateTokenStatus,
  deleteFCMToken,
};
