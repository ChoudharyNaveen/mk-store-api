/* eslint-disable import/no-extraneous-dependencies */
const config = require('./index');

// ============================================================================
// CONFIGURATION
// ============================================================================

const accountSid = config.SMS?.TWILIO?.ACCOUNT_SID;
const authToken = config.SMS?.TWILIO?.AUTH_TOKEN;

const twilioClient = accountSid && authToken
  ? require('twilio')(accountSid, authToken)
  : null;

// ============================================================================
// SMS FUNCTIONS
// ============================================================================

/**
 * Send SMS via Twilio
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} - Twilio response wrapper
 */
const sendSMS = async (phoneNumber, message) => {
  // If mock SMS is enabled, return mock success response
  const useMockSms = config.SMS?.USE_MOCK_SMS;

  if (useMockSms) {
    console.log('Mock SMS mode enabled - SMS not sent via Twilio');
    console.log(`Would send SMS to ${phoneNumber}: ${message}`);

    return {
      success: true,
      messageId: `mock-message-id-${Date.now()}`,
      response: { mock: true },
    };
  }

  try {
    if (!twilioClient) {
      return {
        success: false,
        error: 'Twilio is not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
      };
    }

    const fromNumber = config.SMS?.TWILIO?.FROM_NUMBER;

    if (!fromNumber) {
      return {
        success: false,
        error: 'Twilio from number is missing. Please set TWILIO_FROM_NUMBER.',
      };
    }

    const response = await twilioClient.messages.create({
      to: phoneNumber,
      from: fromNumber,
      body: message,
    });

    return {
      success: true,
      messageId: response.sid,
      response,
    };
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  sendSMS,
  twilioClient,
};
