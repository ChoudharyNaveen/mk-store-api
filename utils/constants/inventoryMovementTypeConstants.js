const INVENTORY_MOVEMENT_TYPE = {
  ADDED: 'ADDED',
  REMOVED: 'REMOVED',
  ADJUSTED: 'ADJUSTED',
  REVERTED: 'REVERTED',
  RETURNED: 'RETURNED',
};

const INVENTORY_MOVEMENT_TYPE_ENUM = Object.values(INVENTORY_MOVEMENT_TYPE);

/**
 * Validate if a given movement type is valid
 * @param {string} movementType
 * @returns {boolean}
 */
const isValidMovementType = (movementType) => INVENTORY_MOVEMENT_TYPE_ENUM.includes(movementType);

/**
 * Check if movement type requires positive quantity change
 * @param {string} movementType
 * @returns {boolean}
 */
const requiresPositiveQuantity = (movementType) => movementType === INVENTORY_MOVEMENT_TYPE.ADDED
    || movementType === INVENTORY_MOVEMENT_TYPE.REVERTED
    || movementType === INVENTORY_MOVEMENT_TYPE.RETURNED;

/**
 * Check if movement type requires negative quantity change
 * @param {string} movementType
 * @returns {boolean}
 */
const requiresNegativeQuantity = (movementType) => movementType === INVENTORY_MOVEMENT_TYPE.REMOVED;

module.exports = {
  INVENTORY_MOVEMENT_TYPE,
  INVENTORY_MOVEMENT_TYPE_ENUM,
  isValidMovementType,
  requiresPositiveQuantity,
  requiresNegativeQuantity,
};
