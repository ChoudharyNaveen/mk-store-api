/**
 * Notification Type Constants
 */
const NOTIFICATION_TYPE = {
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_READY_FOR_PICKUP: 'ORDER_READY_FOR_PICKUP',
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  ORDER_ARRIVED: 'ORDER_ARRIVED',
  USER_REGISTERED: 'USER_REGISTERED',
};

const NOTIFICATION_TYPE_ENUM = Object.values(NOTIFICATION_TYPE);

/**
 * Entity Type Constants
 */
const ENTITY_TYPE = {
  ORDER: 'ORDER',
  USER: 'USER',
};

const ENTITY_TYPE_ENUM = Object.values(ENTITY_TYPE);

/**
 * Notification Priority Constants
 */
const NOTIFICATION_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

const NOTIFICATION_PRIORITY_ENUM = Object.values(NOTIFICATION_PRIORITY);

/**
 * Notification Status Constants
 */
const NOTIFICATION_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
};

const NOTIFICATION_STATUS_ENUM = Object.values(NOTIFICATION_STATUS);

/**
 * Validate notification type
 * @param {string} type - Notification type to validate
 * @returns {boolean}
 */
const isValidNotificationType = (type) => NOTIFICATION_TYPE_ENUM.includes(type);

/**
 * Validate entity type
 * @param {string} type - Entity type to validate
 * @returns {boolean}
 */
const isValidEntityType = (type) => ENTITY_TYPE_ENUM.includes(type);

/**
 * Validate notification priority
 * @param {string} priority - Priority to validate
 * @returns {boolean}
 */
const isValidPriority = (priority) => NOTIFICATION_PRIORITY_ENUM.includes(priority);

/**
 * Validate notification status
 * @param {string} status - Status to validate
 * @returns {boolean}
 */
const isValidNotificationStatus = (status) => NOTIFICATION_STATUS_ENUM.includes(status);

module.exports = {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_ENUM,
  ENTITY_TYPE,
  ENTITY_TYPE_ENUM,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_PRIORITY_ENUM,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_ENUM,
  isValidNotificationType,
  isValidEntityType,
  isValidPriority,
  isValidNotificationStatus,
};
