/**
 * Combo Discount Type Constants
 */
const COMBO_DISCOUNT_TYPE = {
  PERCENT: 'PERCENT',
  FLATOFF: 'FLATOFF',
};

const COMBO_DISCOUNT_TYPE_ENUM = Object.values(COMBO_DISCOUNT_TYPE);

/**
 * Validate if a given discount type is a valid combo discount type
 * @param {string} discountType
 * @returns {boolean}
 */
const isValidComboDiscountType = (discountType) => COMBO_DISCOUNT_TYPE_ENUM.includes(discountType);

module.exports = {
  COMBO_DISCOUNT_TYPE,
  COMBO_DISCOUNT_TYPE_ENUM,
  isValidComboDiscountType,
};
