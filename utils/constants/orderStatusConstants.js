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

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_ENUM,
  isValidOrderStatus,
  ORDER_STATUS_TRANSITIONS,
  canTransitionToStatus,
};
