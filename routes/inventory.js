const {
  getInventoryMovements,
  adjustInventory,
} = require('../controllers/inventoryMovementController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getInventoryMovements: getInventoryMovementsSchema,
  adjustInventory: adjustInventorySchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /get-inventory-movements:
   *   post:
   *     summary: Get inventory movement history (VENDOR_ADMIN only)
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               productId:
   *                 type: integer
   *               variantId:
   *                 type: integer
   *               vendorId:
   *                 type: integer
   *               branchId:
   *                 type: integer
   *               movementType:
   *                 type: string
   *                 enum: [ADDED, REMOVED, ADJUSTED, REVERTED]
   *               dateFrom:
   *                 type: string
   *                 format: date-time
   *               dateTo:
   *                 type: string
   *                 format: date-time
   *               pageSize:
   *                 type: integer
   *                 enum: [1, 5, 10, 20, 30, 40, 50, 100, 500]
   *                 default: 10
   *               pageNumber:
   *                 type: integer
   *                 minimum: 1
   *                 default: 1
   *               filters:
   *                 type: array
   *               sorting:
   *                 type: array
   *     responses:
   *       200:
   *         description: Inventory movements retrieved successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/get-inventory-movements',
    isAuthenticated,
    isVendorAdmin,
    validate(getInventoryMovementsSchema),
    getInventoryMovements,
  );

  /**
   * @swagger
   * /adjust-inventory:
   *   post:
   *     summary: Manual inventory adjustment (VENDOR_ADMIN only)
   *     tags: [Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - productId
   *               - quantityChange
   *             properties:
   *               productId:
   *                 type: integer
   *                 example: 1
   *               variantId:
   *                 type: integer
   *                 example: 5
   *               quantityChange:
   *                 type: integer
   *                 example: 10
   *                 description: Positive for increase, negative for decrease
   *               notes:
   *                 type: string
   *                 example: "Stock adjustment due to damaged items"
   *     responses:
   *       200:
   *         description: Inventory adjusted successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/adjust-inventory',
    isAuthenticated,
    isVendorAdmin,
    validate(adjustInventorySchema),
    adjustInventory,
  );
};
