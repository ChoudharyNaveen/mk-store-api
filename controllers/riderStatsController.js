const RiderStatsService = require('../services/riderStatsService');
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

// Get Rider Stats
const getRiderStats = async (req, res) => {
  try {
    const data = req.validatedData;
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(res, 401, 'User not authenticated', 'AUTHENTICATION_FAILED');
    }

    const { errors: err, doc } = await RiderStatsService.getRiderStats(
      userId,
      data.vendorId,
    );

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

// Update Rider Stats
const updateRiderStats = async (req, res) => {
  try {
    const data = req.validatedData;
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(res, 401, 'User not authenticated', 'AUTHENTICATION_FAILED');
    }

    const statsData = {
      total_orders: data.totalOrders,
      total_deliveries: data.totalDeliveries,
      completed_orders: data.completedOrders,
      cancelled_orders: data.cancelledOrders,
      rating: data.rating,
    };

    // Remove undefined values
    Object.keys(statsData).forEach((key) => {
      if (statsData[key] === undefined) {
        delete statsData[key];
      }
    });

    const { errors: err, doc } = await RiderStatsService.updateRiderStats(
      userId,
      data.vendorId,
      statsData,
    );

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      message: 'Rider stats updated successfully',
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  getRiderStats,
  updateRiderStats,
};
