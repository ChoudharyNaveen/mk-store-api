const {
  saveCategory,
  getCategory,
  updateCategory,
} = require('../controllers/categoryController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  saveCategory: saveCategorySchema,
  getCategory: getCategorySchema,
  updateCategory: updateCategorySchema,
} = require('../schemas')
const multer = require('multer')
const upload = multer()

module.exports = (router) => {
  /**
   * @swagger
   * /save-category:
   *   post:
   *     summary: Create a new category
   *     tags: [Categories]
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
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Electronics"
   *               description:
   *                 type: string
   *                 example: "Electronic devices and accessories"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Category image file
   *     responses:
   *       200:
   *         description: Category created successfully
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
   *                   example: "Category created successfully"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     publicId:
   *                       type: string
   *                     name:
   *                       type: string
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-category',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(saveCategorySchema),
    saveCategory
  )

  /**
   * @swagger
   * /get-category:
   *   get:
   *     summary: Get categories with pagination
   *     tags: [Categories]
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
   *         description: Categories retrieved successfully
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
   *                       description:
   *                         type: string
   *                       imageUrl:
   *                         type: string
   *                 count:
   *                   type: integer
   */
  router.get('/get-category', isAuthenticated, validate(getCategorySchema), getCategory)

  /**
   * @swagger
   * /update-category/{publicId}:
   *   patch:
   *     summary: Update a category
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Category public ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Updated Category Name"
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
   *         description: Category updated successfully
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
    '/update-category/:publicId',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(updateCategorySchema),
    updateCategory
  )
}
