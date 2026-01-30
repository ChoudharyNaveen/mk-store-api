const { Notification: NotificationService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');
const { ROLE } = require('../utils/constants/roleConstants');

/**
 * Get notifications with pagination
 */
const getNotifications = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    // Extract user info from request (if available)
    const userId = req.user?.id;
    const userRole = req.user?.roleName || req.user?.role;
    const vendorId = req.user?.vendorId;
    const branchId = req.user?.branchId;

    const { totalCount, doc } = await NotificationService.getNotifications({
      ...data,
      userId,
      userRole,
      vendorId,
      branchId,
      recipientId: data.recipientId || userId,
      recipientType: userRole === ROLE.VENDOR_ADMIN ? ROLE.VENDOR_ADMIN : ROLE.USER,
    });

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.roleName || req.user?.role;
    const vendorId = req.user?.vendorId || req.query.vendorId;
    const branchId = req.user?.branchId || req.query.branchId;

    const { doc, errors } = await NotificationService.getUnreadCount({
      userId,
      userRole,
      vendorId,
      branchId,
    });

    if (errors) {
      return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
    }

    return res.status(200).json({ success: true, ...doc });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    const { doc, errors } = await NotificationService.markAsRead(notificationId, userId);

    if (errors) {
      return sendErrorResponse(res, 404, extractErrorMessage(errors), 'NOT_FOUND');
    }

    return res.status(200).json({ success: true, doc });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.roleName || req.user?.role;
    const vendorId = req.user?.vendorId;
    const branchId = req.user?.branchId;

    const { doc, errors } = await NotificationService.markAllAsRead({
      userId,
      userRole,
      vendorId,
      branchId,
    });

    if (errors) {
      return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
    }

    return res.status(200).json({ success: true, message: 'All notifications marked as read', ...doc });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const { doc, errors } = await NotificationService.deleteNotification(notificationId);

    if (errors) {
      return sendErrorResponse(res, 404, extractErrorMessage(errors), 'NOT_FOUND');
    }

    return res.status(200).json({ success: true, ...doc });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
