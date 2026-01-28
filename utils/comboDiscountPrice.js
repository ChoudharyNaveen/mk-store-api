const { COMBO_DISCOUNT_TYPE } = require('./constants/comboDiscountTypeConstants');
const { ValidationError } = require('./serviceErrors');

/**
 * Calculate discounted price for ONE combo set.
 * A combo set means `comboQuantity` items at `sellingPrice` each.
 *
 * @param {object} params
 * @param {number} params.sellingPrice
 * @param {number} params.comboQuantity
 * @param {'PERCENT'|'FLATOFF'} params.discountType
 * @param {number} params.discountValue
 * @returns {number} discount_price (integer, rounded)
 */
function calculateComboDiscountPricePerSet({
  sellingPrice,
  comboQuantity,
  discountType,
  discountValue,
}) {
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    throw new ValidationError('Invalid sellingPrice for combo discount calculation');
  }
  if (!Number.isInteger(comboQuantity) || comboQuantity <= 0) {
    throw new ValidationError('Invalid comboQuantity for combo discount calculation');
  }
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    throw new ValidationError('Invalid discountValue for combo discount calculation');
  }

  const basePrice = comboQuantity * sellingPrice;

  if (discountType === COMBO_DISCOUNT_TYPE.PERCENT) {
    return Math.round(basePrice * (1 - discountValue / 100));
  }

  if (discountType === COMBO_DISCOUNT_TYPE.FLATOFF) {
    const discounted = Math.round(basePrice - discountValue);
    return discounted < 0 ? 0 : discounted;
  }

  throw new ValidationError(`Invalid discount type. Must be ${COMBO_DISCOUNT_TYPE.PERCENT} or ${COMBO_DISCOUNT_TYPE.FLATOFF}`);
}

module.exports = {
  calculateComboDiscountPricePerSet,
};

