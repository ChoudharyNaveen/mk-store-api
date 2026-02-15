const { ROLE } = require('./roleConstants');

const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  PICKED_UP: 'PICKED_UP',
  ARRIVED: 'ARRIVED',
  RETURN: 'RETURN',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED',
  FAILED: 'FAILED',
};

const ORDER_STATUS_ENUM = Object.values(ORDER_STATUS);

/**
 * Roles allowed to perform each status transition (oldStatus -> newStatus).
 * SUPER_ADMIN can perform any transition; other roles are restricted by workflow.
 */
const ALLOWED_ROLES_FOR_STATUS_TRANSITION = {
  [ORDER_STATUS.PENDING]: {
    [ORDER_STATUS.ACCEPTED]: [ ROLE.VENDOR_ADMIN, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.CANCELLED]: [ ROLE.VENDOR_ADMIN, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.REJECTED]: [ ROLE.VENDOR_ADMIN, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.FAILED]: [ ROLE.VENDOR_ADMIN, ROLE.SUPER_ADMIN ],
  },
  [ORDER_STATUS.ACCEPTED]: {
    [ORDER_STATUS.READY_FOR_PICKUP]: [ ROLE.VENDOR_ADMIN, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.CANCELLED]: [ ROLE.VENDOR_ADMIN, ROLE.SUPER_ADMIN ],
  },
  [ORDER_STATUS.READY_FOR_PICKUP]: {
    [ORDER_STATUS.PICKED_UP]: [ ROLE.RIDER, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.CANCELLED]: [ ROLE.VENDOR_ADMIN, ROLE.RIDER, ROLE.SUPER_ADMIN ],
  },
  [ORDER_STATUS.PICKED_UP]: {
    [ORDER_STATUS.ARRIVED]: [ ROLE.RIDER, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.DELIVERED]: [ ROLE.RIDER, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.CANCELLED]: [ ROLE.VENDOR_ADMIN, ROLE.RIDER, ROLE.SUPER_ADMIN ],
  },
  [ORDER_STATUS.ARRIVED]: {
    [ORDER_STATUS.DELIVERED]: [ ROLE.RIDER, ROLE.SUPER_ADMIN ],
    [ORDER_STATUS.CANCELLED]: [ ROLE.VENDOR_ADMIN, ROLE.RIDER, ROLE.SUPER_ADMIN ],
  },
  [ORDER_STATUS.RETURN]: {
    [ORDER_STATUS.RETURNED]: [ ROLE.RIDER, ROLE.VENDOR_ADMIN, ROLE.SUPER_ADMIN ],
  },
  [ORDER_STATUS.DELIVERED]: {},
  [ORDER_STATUS.CANCELLED]: {},
  [ORDER_STATUS.REJECTED]: {},
  [ORDER_STATUS.RETURNED]: {},
  [ORDER_STATUS.FAILED]: {},
};

/**
 * Validate if a given status is a valid order status
 * @param {string} status
 * @returns {boolean}
 */
const isValidOrderStatus = (status) => ORDER_STATUS_ENUM.includes(status);

/**
 * Define allowed status transitions (can be extended as needed)
 */
const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REJECTED,
    ORDER_STATUS.FAILED,
  ],
  [ORDER_STATUS.ACCEPTED]: [
    ORDER_STATUS.READY_FOR_PICKUP,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.READY_FOR_PICKUP]: [
    ORDER_STATUS.PICKED_UP,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PICKED_UP]: [
    ORDER_STATUS.ARRIVED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.RETURN]: [
    ORDER_STATUS.RETURNED,
  ],
  [ORDER_STATUS.ARRIVED]: [
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REJECTED]: [],
  [ORDER_STATUS.RETURNED]: [],
  [ORDER_STATUS.FAILED]: [],
};

/**
 * Check if a transition from currentStatus to nextStatus is allowed
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
const canTransitionToStatus = (currentStatus, nextStatus) => {
  if (!currentStatus || !nextStatus) {
    return false;
  }

  const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  return allowedNextStatuses.includes(nextStatus);
};

/**
 * Check if a role is allowed to perform the status transition from oldStatus to newStatus
 * @param {string} oldStatus
 * @param {string} newStatus
 * @param {string[]} userRoleNames - Array of role names (e.g. ['RIDER'], ['VENDOR_ADMIN'])
 * @returns {boolean}
 */
const canTransitionByRole = (oldStatus, newStatus, roleName) => {
  if (!roleName) {
    return false;
  }

  const allowedRoles = ALLOWED_ROLES_FOR_STATUS_TRANSITION[oldStatus]?.[newStatus];

  if (!allowedRoles || allowedRoles.length === 0) {
    return false;
  }

  return allowedRoles.includes(roleName);
};

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_ENUM,
  isValidOrderStatus,
  ORDER_STATUS_TRANSITIONS,
  ALLOWED_ROLES_FOR_STATUS_TRANSITION,
  canTransitionToStatus,
  canTransitionByRole,
};
