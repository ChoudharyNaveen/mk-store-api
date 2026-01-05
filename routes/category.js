const multer = require('multer');
const {
  saveCategory,
  getCategory,
  updateCategory,
  getCategoryDetails,
} = require('../controllers/categoryController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveCategory: saveCategorySchema,
  getCategory: getCategorySchema,
  updateCategory: updateCategorySchema,
} = require('../schemas');

const upload = multer();

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
   *               - title
   *               - description
   *               - branchId
   *               - vendorId
   *             properties:
   *               title:
   *                 type: string
   *                 example: "Electronics"
   *                 description: Category title (required)
   *               description:
   *                 type: string
   *                 example: "Electronic devices and accessories"
   *                 description: Category description (required)
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
   *                 description: Category status (optional, defaults to ACTIVE)
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Category image file (required)
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
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     title:
   *                       type: string
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-category',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(saveCategorySchema),
    saveCategory,
  );

  /**
   * @swagger
   * /get-category:
   *   post:
   *     summary: Get categories with pagination
   *     tags: [Categories]
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
   *                       id:
   *                         type: integer
   *                         example: 1
   *                       title:
   *                         type: string
   *                       description:
   *                         type: string
   *                       imageUrl:
   *                         type: string
   *                 count:
   *                   type: integer
   */
  router.post('/get-category', isAuthenticated, validate(getCategorySchema), getCategory);

  /**
   * @swagger
   * /update-category/{id}:
   *   patch:
   *     summary: Update a category
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Category ID
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
   *                 example: "Updated Category Name"
   *                 description: Category title (optional)
   *               description:
   *                 type: string
   *                 example: "Updated description"
   *                 description: Category description (optional)
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
   *                 description: Category status (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the category
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Category image file (optional)
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
  /**
   * @swagger
   * /get-category-details/{categoryId}:
   *   get:
   *     summary: Get detailed category information
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Category ID
   *     responses:
   *       200:
   *         description: Category details retrieved successfully
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
   *                     id:
   *                       type: integer
   *                     title:
   *                       type: string
   *                     description:
   *                       type: string
   *                     image:
   *                       type: string
   *                     statistics:
   *                       type: object
   *                       properties:
   *                         subcategory_count:
   *                           type: integer
   *                         product_count:
   *                           type: integer
   *                     sub_categories:
   *                       type: array
   *                       items:
   *                         type: object
   *                     products:
   *                       type: array
   *                       items:
   *                         type: object
   *       404:
   *         description: Category not found
   */
  router.get('/get-category-details/:categoryId', isAuthenticated, getCategoryDetails);

  router.patch(
    '/update-category/:id',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(updateCategorySchema),
    updateCategory,
  );
};
