const {
  getOrderItem,
} = require('../controllers/orderItemController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getOrderItem: getOrderItemSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /get-order-item:
   *   post:
   *     summary: Get order items
   *     tags: [OrderItems]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               pageSize:
   *                 type: integer
   *                 enum: [1, 5, 10, 20, 30, 40, 50, 100, 500]
   *                 default: 10
   *                 description: Number of results per page
   *               pageNumber:
   *                 type: integer
   *                 minimum: 1
   *                 default: 1
   *                 description: Page number
   *               filters:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     key:
   *                       type: string
   *                     eq:
   *                       type: string
   *                     in:
   *                       type: array
   *                       items:
   *                         type: string
   *                     neq:
   *                       type: string
   *                     gt:
   *                       type: string
   *                     gte:
   *                       type: string
   *                     lt:
   *                       type: string
   *                     lte:
   *                       type: string
   *                     like:
   *                       type: string
   *                     iLike:
   *                       type: string
   *                 description: Array of filter objects
   *               sorting:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     key:
   *                       type: string
   *                     direction:
   *                       type: string
   *                       enum: [ASC, DESC]
   *                 description: Array of sorting objects
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
  router.post('/get-order-item', isAuthenticated, validate(getOrderItemSchema), getOrderItem);
};
