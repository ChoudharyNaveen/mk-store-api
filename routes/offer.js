const multer = require('multer');
const {
  saveOffer,
  getOffer,
  getOfferSummary,
  updateOffer,
} = require('../controllers/offerController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveOffer: saveOfferSchema,
  getOffer: getOfferSchema,
  getOfferSummary: getOfferSummarySchema,
  updateOffer: updateOfferSchema,
} = require('../schemas');

const upload = multer();

module.exports = (router) => {
  /**
   * @swagger
   * /save-offer:
   *   post:
   *     summary: Create a new offer
   *     tags: [Offers, ADMIN]
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
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(saveOfferSchema),
    saveOffer,
  );

  /**
   * @swagger
   * /get-offer:
   *   post:
   *     summary: Get offers with pagination
   *     tags: [Offers, BOTH]
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
  router.post('/get-offer', isAuthenticated, validate(getOfferSchema), getOffer);

  /**
   * @swagger
   * /get-offer-summary:
   *   post:
   *     summary: Get offer summary (total redemptions and total discounts given)
   *     tags: [Offers, BOTH]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - id
   *             properties:
   *               id:
   *                 type: integer
   *                 example: 1
   *                 description: Offer ID
   *     responses:
   *       200:
   *         description: Offer summary retrieved successfully
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
   *                     totalRedemptions:
   *                       type: integer
   *                       example: 28
   *                       description: Total number of times the offer was redeemed
   *                     totalDiscountsGiven:
   *                       type: number
   *                       example: 840.00
   *                       description: Total discount amount given (sum of discount_amount)
   */
  router.post('/get-offer-summary', isAuthenticated, validate(getOfferSummarySchema), getOfferSummary);

  /**
   * @swagger
   * /update-offer/{id}:
   *   patch:
   *     summary: Update an offer
   *     tags: [Offers, ADMIN]
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
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(updateOfferSchema),
    updateOffer,
  );
};
