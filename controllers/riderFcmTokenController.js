const RiderFcmTokenService = require('../services/riderFcmTokenService');
const { handleServerError, sendErrorResponse } = require('../utils/errorHandlers');

const extractErrorMessage = (error) => {
  if (error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An error occurred';
};

// Register FCM Token
const registerFCMToken = async (req, res) => {
  try {
    const data = req.validatedData;
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(res, 401, 'User not authenticated', 'AUTHENTICATION_FAILED');
    }

    const { errors: err, doc } = await RiderFcmTokenService.registerFCMToken({
      userId,
      fcmToken: data.fcmToken,
      vendorId: data.vendorId,
      branchId: data.branchId || null,
      deviceInfo: {
        deviceType: data.deviceType || null,
        deviceId: data.deviceId || null,
      },
    });

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      message: 'FCM token registered successfully',
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Remove FCM Token
const removeFCMToken = async (req, res) => {
  try {
    const data = req.validatedData;
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(res, 401, 'User not authenticated', 'AUTHENTICATION_FAILED');
    }

    // Get token by tokenId or fcmToken
    let { tokenId } = data;

    if (!tokenId && data.fcmToken) {
      const { doc: token } = await RiderFcmTokenService.getRiderTokenByUserId(userId);

      if (token && token.fcm_token === data.fcmToken) {
        tokenId = token.id;
      } else {
        return sendErrorResponse(res, 404, 'FCM token not found', 'NOT_FOUND');
      }
    }

    if (!tokenId) {
      return sendErrorResponse(res, 400, 'Token ID or FCM token is required', 'VALIDATION_ERROR');
    }

    const { errors: err, doc } = await RiderFcmTokenService.deleteFCMToken(tokenId);

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      message: 'FCM token removed successfully',
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Get FCM Token
const getFCMToken = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(res, 401, 'User not authenticated', 'AUTHENTICATION_FAILED');
    }

    const { errors: err, doc } = await RiderFcmTokenService.getRiderTokenByUserId(userId);

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  registerFCMToken,
  removeFCMToken,
  getFCMToken,
};
