const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const config = require('./index');

// Initialize AWS SNS Client
const snsClient = new SNSClient({
  region: config.AWS.REGION,
  credentials: {
    accessKeyId: config.AWS.ACCESS_KEY_ID,
    secretAccessKey: config.AWS.SECRET_ACCESS_KEY,
  },
});

/**
 * Send SMS via AWS SNS
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} - AWS SNS response
 */
const sendSMS = async (phoneNumber, message) => {
  // If mock SMS is enabled, return mock success response
  if (config.AWS.USE_MOCK_SMS) {
    console.log('Mock SMS mode enabled - SMS not sent via AWS');
    console.log(`Would send SMS to ${phoneNumber}: ${message}`);

    return {
      success: true,
      messageId: `mock-message-id-${Date.now()}`,
      response: { mock: true },
    };
  }

  try {
    const params = {
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: config.AWS.SNS.SMS_TYPE,
        },
      },
    };

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
      response,
    };
  } catch (error) {
    console.error('Error sending SMS via AWS SNS:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  sendSMS,
  snsClient,
};
