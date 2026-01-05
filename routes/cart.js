const {
  saveCart,
  getCart,
  deleteCart,
  updateCart,
} = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveCart: saveCartSchema,
  getCart: getCartSchema,
  deleteCart: deleteCartSchema,
  updateCart: updateCartSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /add-to-cart:
   *   post:
   *     summary: Add item to cart
   *     tags: [Cart]
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
   *               - quantity
   *             properties:
   *               productId:
   *                 type: string
   *                 example: "product-uuid-here"
   *               quantity:
   *                 type: integer
   *                 minimum: 1
   *                 example: 2
   *     responses:
   *       200:
   *         description: Item added to cart successfully
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
   *                   example: "successfully added"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     product_id:
   *                       type: integer
   *                       example: 1
   *                     quantity:
   *                       type: integer
   *       400:
   *         description: Validation error or item already in cart
   */
  router.post('/add-to-cart', isAuthenticated, validate(saveCartSchema), saveCart);

  /**
   * @swagger
   * /get-cart:
   *   post:
   *     summary: Get user's cart items
   *     tags: [Cart]
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
   *         description: Cart items retrieved successfully
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
   *                       product_id:
   *                         type: integer
   *                         example: 1
   *                       productDetails:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                           price:
   *                             type: number
   *                       quantity:
   *                         type: integer
   *                 count:
   *                   type: integer
   *                   example: 5
   */
  router.post('/get-cart', isAuthenticated, validate(getCartSchema), getCart);

  /**
   * @swagger
   * /delete-cart:
   *   delete:
   *     summary: Remove item from cart
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: cartId
   *         required: true
   *         schema:
   *           type: string
   *         description: Cart item ID to delete
   *     responses:
   *       200:
   *         description: Item removed from cart successfully
   *         headers:
   *           message:
   *             schema:
   *               type: string
   *             example: "successfully deleted"
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       400:
   *         description: Error deleting cart item
   */
  router.delete('/delete-cart', isAuthenticated, validate(deleteCartSchema), deleteCart);

  /**
   * @swagger
   * /update-cart/{id}:
   *   patch:
   *     summary: Update cart item quantity
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Cart item ID
   *       - in: header
   *         name: x-concurrencystamp
   *         schema:
   *           type: string
   *         description: Concurrency stamp for optimistic locking
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               quantity:
   *                 type: integer
   *                 minimum: 0
   *                 example: 3
   *     responses:
   *       200:
   *         description: Cart item updated successfully
   *         headers:
   *           x-concurrencystamp:
   *             schema:
   *               type: string
   *           message:
   *             schema:
   *               type: string
   *             example: "successfully updated."
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       409:
   *         description: Concurrency conflict
   *       400:
   *         description: Validation error
   */
  router.patch('/update-cart/:id', isAuthenticated, validate(updateCartSchema), updateCart);
};
