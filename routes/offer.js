const {
  saveOffer,
  getOffer,
  updateOffer,
} = require('../controllers/offerController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  saveOffer: saveOfferSchema,
  getOffer: getOfferSchema,
  updateOffer: updateOfferSchema,
} = require('../schemas')
const multer = require('multer')
const upload = multer()

module.exports = (router) => {
  /**
   * @swagger
   * /save-offer:
   *   post:
   *     summary: Create a new offer
   *     tags: [Offers]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - discount
   *             properties:
   *               title:
   *                 type: string
   *                 example: "Summer Sale"
   *               description:
   *                 type: string
   *                 example: "Get amazing discounts this summer"
   *               discount:
   *                 type: number
   *                 example: 30
   *               discountType:
   *                 type: string
   *                 enum: [PERCENTAGE, FIXED]
   *                 example: "PERCENTAGE"
   *               validFrom:
   *                 type: string
   *                 format: date-time
   *                 example: "2025-06-01T00:00:00Z"
   *               validTo:
   *                 type: string
   *                 format: date-time
   *                 example: "2025-08-31T23:59:59Z"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Offer banner image
   *     responses:
   *       200:
   *         description: Offer created successfully
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
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-offer',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(saveOfferSchema),
    saveOffer
  )

  /**
   * @swagger
   * /get-offer:
   *   get:
   *     summary: Get offers with pagination
   *     tags: [Offers]
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
   *         description: Offers retrieved successfully
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
   *                       title:
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
   *                       imageUrl:
   *                         type: string
   *                 count:
   *                   type: integer
   */
  router.get('/get-offer', isAuthenticated, validate(getOfferSchema), getOffer)

  /**
   * @swagger
   * /update-offer/{id}:
   *   patch:
   *     summary: Update an offer
   *     tags: [Offers]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Offer ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               discount:
   *                 type: number
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *               validFrom:
   *                 type: string
   *                 format: date-time
   *               validTo:
   *                 type: string
   *                 format: date-time
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Offer updated successfully
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
    '/update-offer/:id',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(updateOfferSchema),
    updateOffer
  )
}
