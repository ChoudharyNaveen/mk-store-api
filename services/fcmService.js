const { sendFCMNotification, sendFCMNotificationToMultiple, validateFCMToken } = require('../config/firebase');
const { handleServiceError } = require('../utils/serviceErrors');

/**
 * Send FCM notification to a single device
 * @param {string} token - FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Result of the notification send
 */
const sendFCMNotificationToDevice = async (token, title, body, data = {}) => {
  try {
    if (!validateFCMToken(token)) {
      return { success: false, error: 'Invalid FCM token format' };
    }

    const result = await sendFCMNotification(token, title, body, data);

    return result;
  } catch (error) {
    return handleServiceError(error, 'Failed to send FCM notification');
  }
};

/**
 * Send FCM notification to multiple devices
 * @param {Array<string>} tokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Results of the notification sends
 */
const sendFCMNotificationToDevices = async (tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No tokens provided', results: [] };
    }

    // Filter out invalid tokens
    const validTokens = tokens.filter((token) => validateFCMToken(token));

    if (validTokens.length === 0) {
      return { success: false, error: 'No valid tokens provided', results: [] };
    }

    const result = await sendFCMNotificationToMultiple(validTokens, title, body, data);

    return result;
  } catch (error) {
    return handleServiceError(error, 'Failed to send FCM notifications to multiple devices');
  }
};

/**
 * Send FCM notification to a specific user
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Result of the notification send
 */
const sendFCMNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const UserFcmTokenService = require('./userFcmTokenService');

    // Get active FCM token for the user
    const { doc: tokenData } = await UserFcmTokenService.getFCMTokenByUserId(userId);

    if (!tokenData || !tokenData.fcm_token) {
      return {
        success: false,
        error: 'No active FCM token found for user',
      };
    }

    // Send notification to the user's token
    const result = await sendFCMNotificationToDevice(tokenData.fcm_token, title, body, data);

    return result;
  } catch (error) {
    return handleServiceError(error, 'Failed to send FCM notification to user');
  }
};

/**
 * Send FCM notification to multiple users
 * @param {Array<number>} userIds - Array of User IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Results of the notification sends
 */
const sendFCMNotificationToUsers = async (userIds, title, body, data = {}) => {
  try {
    if (!userIds || userIds.length === 0) {
      return { success: false, error: 'No user IDs provided', results: [] };
    }

    const UserFcmTokenService = require('./userFcmTokenService');

    // Get FCM tokens for all users
    const tokenPromises = userIds.map((userId) => UserFcmTokenService.getFCMTokenByUserId(userId));
    const tokenResults = await Promise.all(tokenPromises);

    // Extract valid FCM tokens
    const fcmTokens = tokenResults
      .map((result) => result.doc?.fcm_token)
      .filter(Boolean);

    if (fcmTokens.length === 0) {
      return {
        success: false,
        error: 'No active FCM tokens found for users',
        results: [],
      };
    }

    // Send notifications to all tokens
    const result = await sendFCMNotificationToDevices(fcmTokens, title, body, data);

    return result;
  } catch (error) {
    return handleServiceError(error, 'Failed to send FCM notifications to users');
  }
};

/**
 * Send FCM notification to all active riders for a vendor
 * @param {number} vendorId - Vendor ID
 * @param {number} branchId - Branch ID (optional, for metadata only)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Results of the notification sends
 */
const sendFCMNotificationToRiders = async (vendorId, branchId, title, body, data = {}) => {
  try {
    const RiderStatsService = require('./riderStatsService');
    const UserFcmTokenService = require('./userFcmTokenService');

    // Get all riders for the vendor
    const { doc: riders } = await RiderStatsService.getRidersByVendor(vendorId);

    if (!riders || riders.length === 0) {
      return {
        success: false,
        error: 'No riders found for vendor/branch',
        results: [],
      };
    }

    // Get user IDs from riders
    const userIds = riders.map((rider) => rider.user_id).filter(Boolean);

    if (userIds.length === 0) {
      return {
        success: false,
        error: 'No valid user IDs found',
        results: [],
      };
    }

    // Get FCM tokens for all rider users
    const tokenPromises = userIds.map((userId) => UserFcmTokenService.getFCMTokenByUserId(userId));
    const tokenResults = await Promise.all(tokenPromises);

    // Extract valid FCM tokens
    const fcmTokens = tokenResults
      .map((result) => result.doc?.fcm_token)
      .filter(Boolean);

    if (fcmTokens.length === 0) {
      return {
        success: false,
        error: 'No active FCM tokens found for riders',
        results: [],
      };
    }

    // Send notifications to all tokens
    const result = await sendFCMNotificationToDevices(fcmTokens, title, body, data);

    return result;
  } catch (error) {
    return handleServiceError(error, 'Failed to send FCM notifications to riders');
  }
};

module.exports = {
  sendFCMNotificationToDevice,
  sendFCMNotificationToDevices,
  sendFCMNotificationToUser,
  sendFCMNotificationToUsers,
  sendFCMNotificationToRiders,
  validateFCMToken,
};
