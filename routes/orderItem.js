const {
  getOrderItem,
} = require('../controllers/orderItemController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  getOrderItem: getOrderItemSchema,
} = require('../schemas')

module.exports = (router) => {
  /**
   * @swagger
   * /get-order-item:
   *   get:
   *     summary: Get order items
   *     tags: [OrderItems]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: orderId
   *         schema:
   *           type: string
   *         description: Filter by order ID
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
   *     responses:
   *       200:
   *         description: Order items retrieved successfully
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
   *                       id:
   *                         type: integer
   *                         example: 1
   *                       order_id:
   *                         type: string
   *                       productId:
   *                         type: string
   *                       product:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                           price:
   *                             type: number
   *                       quantity:
   *                         type: integer
   *                       price:
   *                         type: number
   *                       totalPrice:
   *                         type: number
   *                 count:
   *                   type: integer
   */
  router.get('/get-order-item', isAuthenticated, validate(getOrderItemSchema), getOrderItem)
}
