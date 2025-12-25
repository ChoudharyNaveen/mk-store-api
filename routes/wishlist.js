const {
  saveWishlist,
  getWishlist,
  deleteWishlist
} = require('../controllers/wishlistController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  saveWishlist: saveWishlistSchema,
  getWishlist: getWishlistSchema,
  deleteWishlist: deleteWishlistSchema,
} = require('../schemas')

module.exports = (router) => {
  /**
   * @swagger
   * /save-wishlist:
   *   post:
   *     summary: Add item to wishlist
   *     tags: [Wishlist]
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
   *             properties:
   *               productId:
   *                 type: string
   *                 example: "product-uuid-here"
   *     responses:
   *       200:
   *         description: Item added to wishlist successfully
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
   *                   example: "Item added to wishlist"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     product_id:
   *                       type: string
   *       400:
   *         description: Validation error or item already in wishlist
   */
  router.post(
    '/save-wishlist',
    isAuthenticated,
    validate(saveWishlistSchema),
    saveWishlist
  )

  /**
   * @swagger
   * /get-wishlist:
   *   get:
   *     summary: Get user wishlist items
   *     tags: [Wishlist]
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
   *     responses:
   *       200:
   *         description: Wishlist items retrieved successfully
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
   *                         type: string
   *                       product:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                           price:
   *                             type: number
   *                           imageUrl:
   *                             type: string
   *                 count:
   *                   type: integer
   */
  router.get('/get-wishlist', isAuthenticated, validate(getWishlistSchema), getWishlist)

  /**
   * @swagger
   * /delete-wishlist:
   *   delete:
   *     summary: Remove item from wishlist
   *     tags: [Wishlist]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: wishlistId
   *         required: true
   *         schema:
   *           type: string
   *         description: Wishlist item ID to delete
   *     responses:
   *       200:
   *         description: Item removed from wishlist successfully
   *         headers:
   *           message:
   *             schema:
   *               type: string
   *             example: "Item removed from wishlist"
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       400:
   *         description: Error deleting wishlist item
   */
  router.delete('/delete-wishlist', isAuthenticated, validate(deleteWishlistSchema), deleteWishlist)
}
