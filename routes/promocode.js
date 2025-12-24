const {
  savePromocode,
  getPromocode,
  updatePromocode,
} = require('../controllers/promocodeController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  savePromocode: savePromocodeSchema,
  getPromocode: getPromocodeSchema,
  updatePromocode: updatePromocodeSchema,
} = require('../schemas')

module.exports = (router) => {
  /**
   * @swagger
   * /save-Promocode:
   *   post:
   *     summary: Create a new promocode
   *     tags: [Promocodes]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *               - discount
   *               - discountType
   *             properties:
   *               code:
   *                 type: string
   *                 example: "SAVE20"
   *               description:
   *                 type: string
   *                 example: "Get 20% off on your order"
   *               discount:
   *                 type: number
   *                 example: 20
   *               discountType:
   *                 type: string
   *                 enum: [PERCENTAGE, FIXED]
   *                 example: "PERCENTAGE"
   *               minPurchaseAmount:
   *                 type: number
   *                 example: 100
   *               maxDiscountAmount:
   *                 type: number
   *                 example: 500
   *               validFrom:
   *                 type: string
   *                 format: date-time
   *                 example: "2025-01-01T00:00:00Z"
   *               validTo:
   *                 type: string
   *                 format: date-time
   *                 example: "2025-12-31T23:59:59Z"
   *               usageLimit:
   *                 type: integer
   *                 example: 100
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *     responses:
   *       200:
   *         description: Promocode created successfully
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
   *                   example: "Promocode created successfully"
   *                 doc:
   *                   type: object
   *       400:
   *         description: Validation error
   */
  router.post('/save-Promocode', isAuthenticated, validate(savePromocodeSchema), savePromocode)

  /**
   * @swagger
   * /get-Promocode:
   *   get:
   *     summary: Get promocodes with pagination
   *     tags: [Promocodes]
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
   *           enum: [ACTIVE, INACTIVE]
   *         description: Filter by status
   *     responses:
   *       200:
   *         description: Promocodes retrieved successfully
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
   *                       code:
   *                         type: string
   *                       discount:
   *                         type: number
   *                       discountType:
   *                         type: string
   *                       validFrom:
   *                         type: string
   *                         format: date-time
   *                       validTo:
   *                         type: string
   *                         format: date-time
   *                 count:
   *                   type: integer
   */
  router.get('/get-Promocode', isAuthenticated, validate(getPromocodeSchema), getPromocode)

  /**
   * @swagger
   * /update-Promocode/{publicId}:
   *   patch:
   *     summary: Update a promocode
   *     tags: [Promocodes]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Promocode public ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *               discount:
   *                 type: number
   *               discountType:
   *                 type: string
   *                 enum: [PERCENTAGE, FIXED]
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *               validFrom:
   *                 type: string
   *                 format: date-time
   *               validTo:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       200:
   *         description: Promocode updated successfully
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
  router.patch('/update-Promocode/:publicId', isAuthenticated, validate(updatePromocodeSchema), updatePromocode)
}
