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
 * Send FCM notification to all active riders for a vendor/branch
 * @param {number} vendorId - Vendor ID
 * @param {number} branchId - Branch ID (optional)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Results of the notification sends
 */
const sendFCMNotificationToRiders = async (vendorId, branchId, title, body, data = {}) => {
  try {
    const RiderFcmTokenService = require('./riderFcmTokenService');

    // Get all active rider FCM tokens for the vendor/branch
    const { doc: tokens } = await RiderFcmTokenService.getRiderTokens(vendorId, branchId);

    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        error: 'No active rider tokens found',
        results: [],
      };
    }

    // Extract FCM tokens
    const fcmTokens = tokens.map((token) => token.fcm_token).filter(Boolean);

    if (fcmTokens.length === 0) {
      return {
        success: false,
        error: 'No valid FCM tokens found',
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
  sendFCMNotificationToRiders,
  validateFCMToken,
};
