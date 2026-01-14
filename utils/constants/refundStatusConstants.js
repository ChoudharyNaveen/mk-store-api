/**
 * Refund Status Constants
 */
const REFUND_STATUS = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
};

const REFUND_STATUS_ENUM = Object.values(REFUND_STATUS);

/**
 * Validate if a given status is a valid refund status
 * @param {string} status
 * @returns {boolean}
 */
const isValidRefundStatus = (status) => REFUND_STATUS_ENUM.includes(status);

module.exports = {
  REFUND_STATUS,
  REFUND_STATUS_ENUM,
  isValidRefundStatus,
};
