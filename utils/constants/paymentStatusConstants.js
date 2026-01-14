/**
 * Payment Status Constants
 */
const PAYMENT_STATUS = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
  FAILED: 'FAILED',
};

const PAYMENT_STATUS_ENUM = Object.values(PAYMENT_STATUS);

/**
 * Validate if a given status is a valid payment status
 * @param {string} status
 * @returns {boolean}
 */
const isValidPaymentStatus = (status) => PAYMENT_STATUS_ENUM.includes(status);

module.exports = {
  PAYMENT_STATUS,
  PAYMENT_STATUS_ENUM,
  isValidPaymentStatus,
};
