const {
  getRiderStats,
  updateRiderStats,
} = require('../controllers/riderStatsController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getRiderStats: getRiderStatsSchema,
  updateRiderStats: updateRiderStatsSchema,
} = require('../schemas/riderStats');

module.exports = (router) => {
  /**
   * @swagger
   * /rider-stats:
   *   get:
   *     summary: Get rider statistics
   *     tags: [Rider Stats]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: vendorId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Vendor ID
     *     responses:
   *       200:
   *         description: Rider statistics retrieved successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/rider-stats',
    isAuthenticated,
    validate(getRiderStatsSchema, 'query'),
    getRiderStats,
  );

  /**
   * @swagger
   * /rider-stats:
   *   put:
   *     summary: Update rider statistics
   *     tags: [Rider Stats]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - vendorId
   *             properties:
     *               vendorId:
     *                 type: integer
     *                 example: 1
     *               totalOrders:
   *                 type: integer
   *                 minimum: 0
   *                 example: 10
   *               totalDeliveries:
   *                 type: integer
   *                 minimum: 0
   *                 example: 8
   *               completedOrders:
   *                 type: integer
   *                 minimum: 0
   *                 example: 7
   *               cancelledOrders:
   *                 type: integer
   *                 minimum: 0
   *                 example: 1
   *               rating:
   *                 type: number
   *                 minimum: 0
   *                 maximum: 5
   *                 nullable: true
   *                 example: 4.5
   *     responses:
   *       200:
   *         description: Rider statistics updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.put(
    '/rider-stats',
    isAuthenticated,
    validate(updateRiderStatsSchema),
    updateRiderStats,
  );
};
