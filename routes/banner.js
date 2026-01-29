const {
  saveBanner,
  getBanner,
  getBannerById,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveBanner: saveBannerSchema,
  getBanner: getBannerSchema,
  updateBanner: updateBannerSchema,
} = require('../schemas');
const multer = require('multer');

const upload = multer();

module.exports = (router) => {
  /**
   * @swagger
   * /save-banner:
   *   post:
   *     summary: Create a new banner
   *     tags: [Banners, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - vendorId
   *               - branchId
   *             properties:
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID
   *               subCategoryId:
   *                 type: integer
   *                 nullable: true
   *                 example: 5
   *                 description: Subcategory ID (optional)
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Banner image file (required if imageUrl not provided)
   *               imageUrl:
   *                 type: string
   *                 example: "https://example.com/banner.jpg"
   *                 description: URL of the banner image (required if file not provided)
   *               displayOrder:
   *                 type: integer
   *                 example: 1
   *                 default: 0
   *                 description: Order in which banner should be displayed
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 default: ACTIVE
   *                 description: Banner status
   *     responses:
   *       201:
   *         description: Banner created successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-banner',
    isAuthenticated,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(saveBannerSchema),
    saveBanner,
  );

  /**
   * @swagger
   * /get-banner:
   *   post:
   *     summary: Get list of banners with pagination
   *     tags: [Banners, BOTH]
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
   *               pageNumber:
   *                 type: integer
   *                 minimum: 1
   *                 default: 1
   *               filters:
   *                 type: array
   *                 items:
   *                   type: object
   *               sorting:
   *                 type: array
   *                 items:
   *                   type: object
   *     responses:
   *       200:
   *         description: Banners retrieved successfully
   */
  router.post('/get-banner', isAuthenticated, validate(getBannerSchema), getBanner);

  /**
   * @swagger
   * /get-banner-by-id/{id}:
   *   get:
   *     summary: Get banner by ID
   *     tags: [Banners, BOTH]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Banner ID
   *     responses:
   *       200:
   *         description: Banner retrieved successfully
   *       404:
   *         description: Banner not found
   */
  router.get('/get-banner-by-id/:id', isAuthenticated, getBannerById);

  /**
   * @swagger
   * /update-banner/{id}:
   *   put:
   *     summary: Update a banner
   *     tags: [Banners, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Banner ID
   *       - in: header
   *         name: x-concurrencystamp
   *         required: true
   *         schema:
   *           type: string
   *         description: Concurrency stamp for optimistic locking
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               vendorId:
   *                 type: integer
   *               branchId:
   *                 type: integer
   *               subCategoryId:
   *                 type: integer
   *                 nullable: true
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Banner image file (optional, if provided will replace existing image)
   *               imageUrl:
   *                 type: string
   *                 description: URL of the banner image (optional, if file not provided)
   *               displayOrder:
   *                 type: integer
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *     responses:
   *       200:
   *         description: Banner updated successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Concurrency error
   */
  router.put(
    '/update-banner/:id',
    isAuthenticated,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(updateBannerSchema),
    updateBanner,
  );

  /**
   * @swagger
   * /delete-banner/{id}:
   *   delete:
   *     summary: Delete a banner
   *     tags: [Banners, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Banner ID
   *       - in: header
   *         name: x-concurrencystamp
   *         required: true
   *         schema:
   *           type: string
   *         description: Concurrency stamp for optimistic locking
   *     responses:
   *       200:
   *         description: Banner deleted successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Concurrency error
   */
  router.delete('/delete-banner/:id', isAuthenticated, deleteBanner);
};
