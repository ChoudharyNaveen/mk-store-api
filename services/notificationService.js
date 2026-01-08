const {
  notification: NotificationModel,
  user: UserModel,
  order: OrderModel,
} = require('../database');
const {
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const {
  emitToUser,
  emitToVendor,
  emitToBranch,
  emitToRecipientType,
  emitToAll,
} = require('./socketService');
const {
  handleServiceError,
} = require('../utils/serviceErrors');

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (data) => {
  try {
    const notification = await NotificationModel.create(data);

    // Emit real-time notification via Socket.IO
    const notificationData = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      is_read: notification.is_read,
      created_at: notification.createdAt || notification.created_at,
      action_url: notification.action_url,
      icon: notification.icon,
      metadata: notification.metadata,
      entity_type: notification.entity_type,
      entity_id: notification.entity_id,
    };

    // Emit based on recipient type
    // VENDOR_ADMIN type notifications go to VENDOR_ADMIN users
    if (data.recipient_id && data.recipient_type === 'USER') {
      emitToUser(data.recipient_id, notificationData);
    } else if (data.recipient_type === 'VENDOR_ADMIN' && data.vendor_id) {
      // VENDOR_ADMIN notifications are sent to VENDOR_ADMIN users of that vendor
      emitToVendor(data.vendor_id, notificationData);
    } else if (data.branch_id) {
      emitToBranch(data.branch_id, notificationData);
    } else if (data.recipient_type) {
      emitToRecipientType(data.recipient_type, notificationData);
    } else {
      emitToAll(notificationData);
    }

    return { doc: notification };
  } catch (error) {
    return handleServiceError(error, 'Failed to create notification');
  }
};

/**
 * Create notification for new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Created notification
 */
const createOrderPlacedNotification = async (orderData) => {
  const {
    orderId,
    orderNumber,
    vendorId,
    branchId,
    totalAmount,
    userId,
    entityId,
  } = orderData;

  const notificationData = {
    type: 'ORDER_PLACED',
    title: 'New Order Placed',
    message: `New order ${orderNumber} has been placed with total amount ₹${totalAmount}`,
    recipient_type: 'VENDOR_ADMIN',
    vendor_id: vendorId,
    branch_id: branchId,
    entity_type: 'ORDER',
    entity_id: orderId,
    priority: 'HIGH',
    action_url: `/orders/${orderId}`,
    icon: 'shopping-cart',
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      total_amount: totalAmount,
      user_id: userId,
      entity_id: entityId,
    },
  };

  // Create vendor notification (VENDOR_ADMIN will receive this)
  return createNotification(notificationData);
};

/**
 * Create notification for order update
 * @param {Object} orderData - Order update data
 * @returns {Promise<Object>} Created notification
 */
const createOrderUpdatedNotification = async (orderData) => {
  const {
    orderId,
    orderNumber,
    vendorId,
    branchId,
    status,
    userId,
    updatedBy,
  } = orderData;

  const statusMessages = {
    PENDING: 'is pending',
    CONFIRMED: 'has been confirmed',
    SHIPPED: 'has been shipped',
    DELIVERED: 'has been delivered',
    CANCELLED: 'has been cancelled',
  };

  const notificationData = {
    type: 'ORDER_UPDATED',
    title: 'Order Updated',
    message: `Order ${orderNumber} ${statusMessages[status] || 'has been updated'}`,
    recipient_type: 'USER',
    recipient_id: userId,
    vendor_id: vendorId,
    branch_id: branchId,
    entity_type: 'ORDER',
    entity_id: orderId,
    priority: status === 'CANCELLED' ? 'URGENT' : 'MEDIUM',
    action_url: `/orders/${orderId}`,
    icon: 'package',
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      status,
      updated_by: updatedBy,
    },
  };

  // Also notify vendor (VENDOR_ADMIN will receive this)
  if (vendorId) {
    const vendorNotification = {
      ...notificationData,
      recipient_type: 'VENDOR_ADMIN',
      recipient_id: null,
    };

    await createNotification(vendorNotification);
  }

  // Notify vendor admin if order is delivered
  if (status === 'DELIVERED' && vendorId) {
    const vendorAdminNotificationData = {
      type: 'ORDER_DELIVERED',
      title: 'Order Delivered',
      message: `Order ${orderNumber} has been successfully delivered`,
      recipient_type: 'VENDOR_ADMIN',
      recipient_id: null,
      vendor_id: vendorId,
      branch_id: branchId,
      entity_type: 'ORDER',
      entity_id: orderId,
      priority: 'MEDIUM',
      action_url: `/orders/${orderId}`,
      icon: 'check-circle',
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        status,
        user_id: userId,
        vendor_id: vendorId,
        branch_id: branchId,
        updated_by: updatedBy,
      },
    };

    await createNotification(vendorAdminNotificationData);
  }

  return createNotification(notificationData);
};

/**
 * Create notification for new user registration
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created notification
 */
const createUserRegistrationNotification = async (userData) => {
  const {
    userId,
    userName,
    userEmail,
    mobileNumber,
    vendorId,
    branchId,
    roleName,
  } = userData;

  // Only send notification to VENDOR_ADMIN for new user registrations
  if (vendorId) {
    const notificationData = {
      type: 'USER_REGISTERED',
      title: 'New User Registered',
      message: `New user ${userName || mobileNumber || userEmail}${roleName ? ` (${roleName})` : ''} has registered`,
      recipient_type: 'VENDOR_ADMIN',
      recipient_id: null,
      vendor_id: vendorId,
      branch_id: branchId || null,
      entity_type: 'USER',
      entity_id: userId,
      priority: 'MEDIUM',
      action_url: `/users/${userId}`,
      icon: 'user-plus',
      metadata: {
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        mobile_number: mobileNumber,
        role_name: roleName,
        vendor_id: vendorId,
        branch_id: branchId,
        registration_time: new Date(),
      },
    };

    return createNotification(notificationData);
  }

  return { doc: null };
};

/**
 * Get notifications with pagination and filters
 * @param {Object} payload - Query parameters
 * @returns {Promise<Object>} Notifications list
 */
const getNotifications = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting, recipientId, recipientType, vendorId, branchId, userRole, userId,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  // Build where conditions
  const allFilters = filters || [];

  // Determine recipient type based on user role if not explicitly provided
  const finalRecipientType = recipientType;

  // Use userId if recipientId is not provided and recipientType is USER
  const finalRecipientId = recipientId || (finalRecipientType === 'USER' ? userId : null);

  if (finalRecipientId && finalRecipientType === 'USER') {
    allFilters.push({ key: 'recipient_id', eq: finalRecipientId.toString() });
  }

  if (finalRecipientType) {
    allFilters.push({ key: 'recipient_type', eq: finalRecipientType });
  }

  if (vendorId) {
    allFilters.push({ key: 'vendor_id', eq: vendorId.toString() });
  }

  // USER and VENDOR_ADMIN should not be linked with branch_ids
  // Only add branch_id filter if userRole is not USER or VENDOR_ADMIN
  if (branchId && userRole !== 'USER' && userRole !== 'VENDOR_ADMIN') {
    allFilters.push({ key: 'branch_id', eq: branchId.toString() });
  }

  // Default filter for active notifications
  allFilters.push({ key: 'status', eq: 'ACTIVE' });

  const where = generateWhereCondition(allFilters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'created_at', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    NotificationModel,
    {
      where: { ...where },
      attributes: [
        'id',
        'type',
        'title',
        'message',
        'recipient_type',
        'recipient_id',
        'vendor_id',
        'branch_id',
        'entity_type',
        'entity_id',
        'metadata',
        'is_read',
        'read_at',
        'priority',
        'status',
        'action_url',
        'icon',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: OrderModel,
          as: 'order',
          attributes: [ 'id', 'order_number', 'status', 'total_amount' ],
          required: false,
        },
        {
          model: UserModel,
          as: 'recipient',
          attributes: [ 'id', 'name', 'email' ],
          required: false,
        },
      ],
      order,
      limit,
      offset,
    },
  );

  let doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    doc = rows.map((notification) => notification.dataValues);

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID who read the notification (for logging purposes)
 * @returns {Promise<Object>} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  // userId parameter kept for API consistency, can be used for logging in future
  // eslint-disable-next-line no-unused-vars
  const unusedUserId = userId;

  try {
    const notification = await NotificationModel.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return { error: 'NOT_FOUND', message: 'Notification not found' };
    }

    await notification.update({
      is_read: true,
      read_at: new Date(),
    });

    return { doc: notification };
  } catch (error) {
    console.error('Error marking notification as read:', error);

    return { error: 'FAILED', message: 'Failed to mark notification as read' };
  }
};

/**
 * Mark all notifications as read for a user
 * @param {Object} payload - Parameters including userId, userRole, vendorId, branchId
 * @returns {Promise<Object>} Update result
 */
const markAllAsRead = async (payload) => {
  try {
    const {
      userId, userRole, vendorId, branchId,
    } = payload;

    const where = {
      is_read: false,
      status: 'ACTIVE',
    };

    // Determine recipient type based on user role
    let recipientType = 'USER';

    if (userRole === 'VENDOR_ADMIN' || userRole === 'VENDOR_USER') {
      recipientType = 'VENDOR_ADMIN';
    } else if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      recipientType = 'ADMIN';
    }

    if (recipientType === 'USER' && userId) {
      where.recipient_id = userId;
    }

    if (recipientType) {
      where.recipient_type = recipientType;
    }

    if (vendorId) {
      where.vendor_id = vendorId;
    }

    // USER and VENDOR_ADMIN should not be linked with branch_ids
    // Only add branch_id filter if userRole is not USER or VENDOR_ADMIN
    if (branchId && userRole !== 'USER' && userRole !== 'VENDOR_ADMIN') {
      where.branch_id = branchId;
    }

    const [ updatedCount ] = await NotificationModel.update(
      {
        is_read: true,
        read_at: new Date(),
      },
      {
        where,
      },
    );

    return { doc: { updatedCount } };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);

    return { error: 'FAILED', message: 'Failed to mark all notifications as read' };
  }
};

/**
 * Get unread notification count
 * @param {Object} payload - Filter criteria including userId, userRole, vendorId, branchId
 * @returns {Promise<Object>} Unread count
 */
const getUnreadCount = async (payload) => {
  try {
    const {
      userId, userRole, vendorId, branchId,
    } = payload;

    const where = {
      is_read: false,
      status: 'ACTIVE',
    };

    // Determine recipient type based on user role
    let recipientType = 'USER';

    if (userRole === 'VENDOR_ADMIN' || userRole === 'VENDOR_USER') {
      recipientType = 'VENDOR_ADMIN';
    } else if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      recipientType = 'ADMIN';
    }

    if (recipientType === 'USER' && userId) {
      where.recipient_id = userId;
    }

    if (recipientType) {
      where.recipient_type = recipientType;
    }

    if (vendorId) {
      where.vendor_id = vendorId;
    }

    // USER and VENDOR_ADMIN should not be linked with branch_ids
    // Only add branch_id filter if userRole is not USER or VENDOR_ADMIN
    if (branchId && userRole !== 'USER' && userRole !== 'VENDOR_ADMIN') {
      where.branch_id = branchId;
    }

    const count = await NotificationModel.count({ where });

    return { doc: { count } };
  } catch (error) {
    console.error('Error getting unread count:', error);

    return { error: 'FAILED', message: 'Failed to get unread count' };
  }
};

/**
 * Delete notification (soft delete by archiving)
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Deleted notification
 */
const deleteNotification = async (notificationId) => {
  try {
    const notification = await NotificationModel.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return { error: 'NOT_FOUND', message: 'Notification not found' };
    }

    await notification.update({ status: 'DELETED' });

    return { doc: { message: 'Notification deleted successfully' } };
  } catch (error) {
    console.error('Error deleting notification:', error);

    return { error: 'FAILED', message: 'Failed to delete notification' };
  }
};

module.exports = {
  createNotification,
  createOrderPlacedNotification,
  createOrderUpdatedNotification,
  createUserRegistrationNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};
