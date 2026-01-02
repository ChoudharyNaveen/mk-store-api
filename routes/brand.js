const multer = require('multer');
const {
  saveBrand,
  getBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brandController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveBrand: saveBrandSchema,
  getBrand: getBrandSchema,
  updateBrand: updateBrandSchema,
  deleteBrand: deleteBrandSchema,
} = require('../schemas');

const upload = multer();

module.exports = (router) => {
  /**
   * @swagger
   * /save-brand:
   *   post:
   *     summary: Create a new brand
   *     tags: [Brands]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - branchId
   *               - vendorId
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Nike"
   *                 description: Brand name (required)
   *               description:
   *                 type: string
   *                 example: "Just Do It"
   *                 description: Brand description (optional)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID (required)
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID (required)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Brand status (optional, defaults to ACTIVE)
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Brand logo file (optional)
   *     responses:
   *       200:
   *         description: Brand created successfully
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
   *                   example: "Brand created successfully"
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-brand',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(saveBrandSchema),
    saveBrand,
  );

  /**
   * @swagger
   * /get-brand:
   *   post:
   *     summary: Get brands with pagination and filters
   *     tags: [Brands]
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
   *         description: Brands retrieved successfully
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
   *                       name:
   *                         type: string
   *                       description:
   *                         type: string
   *                       logo:
   *                         type: string
   *                       status:
   *                         type: string
   *                 count:
   *                   type: integer
   *                   example: 50
   */
  router.post('/get-brand', isAuthenticated, validate(getBrandSchema), getBrand);

  /**
   * @swagger
   * /update-brand/{id}:
   *   patch:
   *     summary: Update a brand
   *     tags: [Brands]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Brand ID
   *       - in: header
   *         name: x-concurrencystamp
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Concurrency stamp for optimistic locking
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - updatedBy
   *               - concurrencyStamp
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Updated Brand Name"
   *                 description: Brand name (optional)
   *               description:
   *                 type: string
   *                 example: "Updated description"
   *                 description: Brand description (optional)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID (optional)
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID (optional)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Brand status (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the brand
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Brand logo file (optional)
   *     responses:
   *       200:
   *         description: Brand updated successfully
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
    '/update-brand/:id',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(updateBrandSchema),
    updateBrand,
  );

  /**
   * @swagger
   * /delete-brand:
   *   delete:
   *     summary: Delete a brand
   *     tags: [Brands]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: brandId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Brand ID to delete
   *     responses:
   *       200:
   *         description: Brand deleted successfully
   *         headers:
   *           message:
   *             schema:
   *               type: string
   *             example: "Brand deleted successfully"
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       400:
   *         description: Error deleting brand
   */
  router.delete('/delete-brand', isAuthenticated, validate(deleteBrandSchema), deleteBrand);
};
