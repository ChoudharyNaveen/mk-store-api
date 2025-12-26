const {
  saveSubCategory,
  getSubCategory,
  updateSubCategory,
} = require('../controllers/subCategoryController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  saveSubCategory: saveSubCategorySchema,
  getSubCategory: getSubCategorySchema,
  updateSubCategory: updateSubCategorySchema,
} = require('../schemas')
const multer = require('multer')
const upload = multer()

module.exports = (router) => {
  /**
   * @swagger
   * /save-sub-category:
   *   post:
   *     summary: Create a new subcategory
   *     tags: [SubCategories]
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
   *               - description
   *               - categoryId
   *               - vendorId
   *               - branchId
   *             properties:
   *               title:
   *                 type: string
   *                 example: "Smartphones"
   *                 description: Subcategory title (required)
   *               description:
   *                 type: string
   *                 example: "Mobile phones and smartphones"
   *                 description: Subcategory description (required)
   *               categoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Category ID (required)
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID (required)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID (required)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Subcategory status (optional, defaults to ACTIVE)
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Subcategory image file (required)
   *     responses:
   *       200:
   *         description: Subcategory created successfully
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
   *                   example: "Subcategory created successfully"
   *                 doc:
   *                   type: object
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-sub-category',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(saveSubCategorySchema),
    saveSubCategory
  )

  /**
   * @swagger
   * /get-sub-category:
   *   get:
   *     summary: Get subcategories with pagination
   *     tags: [SubCategories]
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
   *         name: categoryId
   *         schema:
   *           type: integer
   *         description: Filter by category ID
   *     responses:
   *       200:
   *         description: Subcategories retrieved successfully
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
   *                       category_id:
   *                         type: integer
   *                         example: 1
   *                 count:
   *                   type: integer
   */
  router.get('/get-sub-category', isAuthenticated, validate(getSubCategorySchema), getSubCategory)

  /**
   * @swagger
   * /update-sub-category/{id}:
   *   patch:
   *     summary: Update a subcategory
   *     tags: [SubCategories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Subcategory ID
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
   *               title:
   *                 type: string
   *                 example: "Updated Subcategory Name"
   *                 description: Subcategory title (optional)
   *               description:
   *                 type: string
   *                 example: "Updated description"
   *                 description: Subcategory description (optional)
   *               categoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Category ID (optional)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Subcategory status (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the subcategory
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Subcategory image file (optional)
   *     responses:
   *       200:
   *         description: Subcategory updated successfully
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
    '/update-sub-category/:id',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(updateSubCategorySchema),
    updateSubCategory
  )
}
