const { ValidationError } = require('./serviceErrors');

/**
 * Enforces only when maxOrderQuantity > 0. Null or ≤0 means no per-order cap.
 * @returns {string|null} Violation message, or null when within limit / no cap.
 */
function overMaxOrderMessage(lineQuantity, maxOrderQuantity, itemLabel = 'this item') {
  const max = maxOrderQuantity == null ? null : Number(maxOrderQuantity);

  if (max == null || max <= 0 || lineQuantity <= max) {
    return null;
  }

  return `Maximum ${max} of ${itemLabel} allowed per order`;
}

function assertWithinMaxOrderQuantity(lineQuantity, maxOrderQuantity, itemLabel) {
  const msg = overMaxOrderMessage(lineQuantity, maxOrderQuantity, itemLabel);

  if (msg) throw new ValidationError(msg);
}

module.exports = {
  overMaxOrderMessage,
  assertWithinMaxOrderQuantity,
};
