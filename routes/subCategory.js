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
   *               - name
   *               - categoryId
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Smartphones"
   *               description:
   *                 type: string
   *                 example: "Mobile phones and smartphones"
   *               categoryId:
   *                 type: string
   *                 example: "category-uuid-here"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Subcategory image file
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
   *           type: string
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
   *                       publicId:
   *                         type: string
   *                       name:
   *                         type: string
   *                       categoryId:
   *                         type: string
   *                 count:
   *                   type: integer
   */
  router.get('/get-sub-category', isAuthenticated, validate(getSubCategorySchema), getSubCategory)

  /**
   * @swagger
   * /update-sub-category/{publicId}:
   *   patch:
   *     summary: Update a subcategory
   *     tags: [SubCategories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Subcategory public ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *               file:
   *                 type: string
   *                 format: binary
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
    '/update-sub-category/:publicId',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(updateSubCategorySchema),
    updateSubCategory
  )
}
