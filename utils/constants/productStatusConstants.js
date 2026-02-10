const PRODUCT_STATUS = {
  INSTOCK: 'INSTOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
};

const PRODUCT_STATUS_ENUM = Object.values(PRODUCT_STATUS);

/**
 * Validate if a given status is a valid product status
 * @param {string} status
 * @returns {boolean}
 */
const isValidProductStatus = (status) => PRODUCT_STATUS_ENUM.includes(status);

/** Default low-stock threshold when variant has no threshold_stock set (quantity < this = LOW_STOCK) */
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/**
 * Determine product status based on quantity and optional threshold stock.
 * - If quantity <= 0 -> OUT_OF_STOCK
 * - Else if thresholdStock > 0 and quantity <= thresholdStock -> LOW_STOCK
 * - Else if no threshold set and quantity < DEFAULT_LOW_STOCK_THRESHOLD (5) -> LOW_STOCK
 * - Else -> INSTOCK
 * @param {number} quantity
 * @param {number} [thresholdStock=0]
 * @returns {string}
 */
const getProductStatusFromQuantity = (quantity, thresholdStock = 0) => {
  const qty = Number.isFinite(quantity) ? quantity : (quantity || 0);
  const threshold = Number.isFinite(thresholdStock) ? thresholdStock : (thresholdStock ?? 0);

  if (qty <= 0) {
    return PRODUCT_STATUS.OUT_OF_STOCK;
  }

  if (threshold > 0 && qty <= threshold) {
    return PRODUCT_STATUS.LOW_STOCK;
  }

  // When variant has no threshold set, use default: quantity < 5 -> LOW_STOCK
  if (threshold === 0 && qty < DEFAULT_LOW_STOCK_THRESHOLD) {
    return PRODUCT_STATUS.LOW_STOCK;
  }

  return PRODUCT_STATUS.INSTOCK;
};

module.exports = {
  PRODUCT_STATUS,
  PRODUCT_STATUS_ENUM,
  DEFAULT_LOW_STOCK_THRESHOLD,
  isValidProductStatus,
  getProductStatusFromQuantity,
};
