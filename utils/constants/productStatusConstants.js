const PRODUCT_STATUS = {
  INSTOCK: 'INSTOCK',
  OUT_OF_STOCK: 'OUT-OF-STOCK',
};

const PRODUCT_STATUS_ENUM = Object.values(PRODUCT_STATUS);

/**
 * Validate if a given status is a valid product status
 * @param {string} status
 * @returns {boolean}
 */
const isValidProductStatus = (status) => PRODUCT_STATUS_ENUM.includes(status);

/**
 * Determine product status based on quantity
 * @param {number} quantity
 * @returns {string}
 */
const getProductStatusFromQuantity = (quantity) => ((quantity || 0) > 0 ? PRODUCT_STATUS.INSTOCK : PRODUCT_STATUS.OUT_OF_STOCK);

module.exports = {
  PRODUCT_STATUS,
  PRODUCT_STATUS_ENUM,
  isValidProductStatus,
  getProductStatusFromQuantity,
};
