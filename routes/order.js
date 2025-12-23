const {
 placeOrder ,
 getOrder,
 getStatsOfOrdersCompleted,
 updateOrder,
 getTotalReturnsOfToday
} = require('../controllers/orderController')
const { isAuthenticated } = require('../middleware/auth')

module.exports = (router) => {
  /**
   * @swagger
   * /place-order:
   *   post:
   *     summary: Place a new order
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - addressId
   *               - cartItems
   *             properties:
   *               addressId:
   *                 type: string
   *                 example: "address-uuid-here"
   *               cartItems:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     cartId:
   *                       type: string
   *                     productId:
   *                       type: string
   *                     quantity:
   *                       type: integer
   *               promocodeId:
   *                 type: string
   *                 example: "promocode-uuid-here"
   *               paymentMethod:
   *                 type: string
   *                 example: "CREDIT_CARD"
   *     responses:
   *       200:
   *         description: Order placed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Order placed successfully"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     publicId:
   *                       type: string
   *                     orderNumber:
   *                       type: string
   *                     totalAmount:
   *                       type: number
   *                     status:
   *                       type: string
   *                       example: "PENDING"
   *       400:
   *         description: Validation error
   */
  router.post(
    '/place-order',
    isAuthenticated,
    placeOrder
  )

  /**
   * @swagger
   * /get-order:
   *   get:
   *     summary: Get user orders
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           enum: [10, 20, 30, 40, 50, 100, 500]
   *           default: 10
   *         description: Number of results per page
   *       - in: query
   *         name: pageNumber
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *         description: Filter by order status
   *     responses:
   *       200:
   *         description: Orders retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 doc:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       publicId:
   *                         type: string
   *                       orderNumber:
   *                         type: string
   *                       totalAmount:
   *                         type: number
   *                       status:
   *                         type: string
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                 count:
   *                   type: integer
   */
  router.get('/get-order', isAuthenticated, getOrder)

  /**
   * @swagger
   * /get-stats-of-orders-completed:
   *   get:
   *     summary: Get statistics of completed orders
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Order statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 doc:
   *                   type: object
   *                   properties:
   *                     totalCompleted:
   *                       type: integer
   *                       example: 150
   *                     totalRevenue:
   *                       type: number
   *                       example: 45000.50
   */
  router.get('/get-stats-of-orders-completed', isAuthenticated, getStatsOfOrdersCompleted)

  /**
   * @swagger
   * /update-order/{publicId}:
   *   patch:
   *     summary: Update order status
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Order public ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED]
   *                 example: "CONFIRMED"
   *     responses:
   *       200:
   *         description: Order updated successfully
   *         headers:
   *           x-concurrencystamp:
   *             schema:
   *               type: string
   *           message:
   *             schema:
   *               type: string
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   */
  router.patch(
    '/update-order/:publicId',
    isAuthenticated,
    updateOrder
  )

  /**
   * @swagger
   * /get-total-returns-of-today:
   *   get:
   *     summary: Get total returns for today
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Returns count retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 doc:
   *                   type: object
   *                   properties:
   *                     totalReturns:
   *                       type: integer
   *                       example: 5
   */
  router.get('/get-total-returns-of-today', isAuthenticated, getTotalReturnsOfToday)
}
