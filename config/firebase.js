const admin = require('firebase-admin');
const config = require('./index');

// Initialize Firebase Admin SDK
let messaging = null;

try {
  if (config.FIREBASE?.ENABLED === false) {
    console.warn('Firebase is disabled via config. FCM notifications will be disabled.');
  } else if (config.FIREBASE?.SERVICE_ACCOUNT_KEY) {
    // Parse service account key from environment variable (JSON string)
    const serviceAccount = JSON.parse(config.FIREBASE.SERVICE_ACCOUNT_KEY);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    messaging = admin.messaging();
    console.log('Firebase Admin SDK initialized successfully');
  } else if (config.FIREBASE?.PROJECT_ID) {
    // Alternative: Initialize with project ID (uses Application Default Credentials)
    admin.initializeApp({
      projectId: config.FIREBASE.PROJECT_ID,
    });

    messaging = admin.messaging();
    console.log('Firebase Admin SDK initialized with project ID');
  } else {
    console.warn('Firebase credentials not found. FCM notifications will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  console.warn('FCM notifications will be disabled.');
}

/**
 * Send FCM notification to a single device
 * @param {string} token - FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Result of the notification send
 */
const sendFCMNotification = async (token, title, body, data = {}) => {
  if (!messaging) {
    console.warn('FCM messaging not initialized. Skipping notification.');

    return { success: false, error: 'FCM not initialized' };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);

          return acc;
        }, {}),
      },
      token,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'order_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.send(message);

    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending FCM notification:', error);

    // Handle specific FCM errors
    if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'INVALID_TOKEN', code: error.code };
    }

    return { success: false, error: error.message, code: error.code };
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
const sendFCMNotificationToMultiple = async (tokens, title, body, data = {}) => {
  if (!messaging) {
    console.warn('FCM messaging not initialized. Skipping notification.');

    return { success: false, error: 'FCM not initialized', results: [] };
  }

  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided', results: [] };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);

          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'order_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast({
      tokens,
      ...message,
    });

    const results = {
      successCount: response.successCount,
      failureCount: response.failureCount,
      results: response.responses.map((resp, idx) => ({
        token: tokens[idx],
        success: resp.success,
        error: resp.error ? {
          code: resp.error.code,
          message: resp.error.message,
        } : null,
      })),
    };

    return { success: true, ...results };
  } catch (error) {
    console.error('Error sending FCM notifications to multiple devices:', error);

    return { success: false, error: error.message, results: [] };
  }
};

/**
 * Validate FCM token format
 * @param {string} token - FCM token to validate
 * @returns {boolean} True if token format is valid
 */
const validateFCMToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Basic FCM token format validation
  // FCM tokens are typically long strings (100+ characters)
  return token.length > 50;
};

module.exports = {
  messaging,
  sendFCMNotification,
  sendFCMNotificationToMultiple,
  validateFCMToken,
};
