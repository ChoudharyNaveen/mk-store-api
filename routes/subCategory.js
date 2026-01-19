const multer = require('multer');
const {
  saveSubCategory,
  getSubCategory,
  getSubCategoriesByCategoryId,
  updateSubCategory,
  getSubCategoryDetails,
  getSubCategoryStats,
} = require('../controllers/subCategoryController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveSubCategory: saveSubCategorySchema,
  getSubCategory: getSubCategorySchema,
  getSubCategoriesByCategoryId: getSubCategoriesByCategoryIdSchema,
  getSubCategoryStats: getSubCategoryStatsSchema,
  updateSubCategory: updateSubCategorySchema,
} = require('../schemas');

const upload = multer();

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
    isVendorAdmin,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(saveSubCategorySchema),
    saveSubCategory,
  );

  /**
   * @swagger
   * /get-sub-category:
   *   post:
   *     summary: Get subcategories with pagination
   *     tags: [SubCategories]
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
  router.post('/get-sub-category', isAuthenticated, validate(getSubCategorySchema), getSubCategory);

  /**
   * @swagger
   * /get-sub-categories-by-category-id:
   *   post:
   *     summary: Get subcategories by category ID with pagination
   *     tags: [SubCategories]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - categoryId
   *             properties:
   *               categoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Category ID (required)
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
   *                       name:
   *                         type: string
   *                         example: "Smartphones"
   *                         description: Subcategory name
   *                       products_count:
   *                         type: integer
   *                         example: 25
   *                         description: Number of active products in this subcategory
   *                       status:
   *                         type: string
   *                         enum: [ACTIVE, INACTIVE]
   *                         example: ACTIVE
   *                         description: Subcategory status
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     pageSize:
   *                       type: integer
   *                       example: 10
   *                     pageNumber:
   *                       type: integer
   *                       example: 1
   *                     totalCount:
   *                       type: integer
   *                       example: 50
   *                     totalPages:
   *                       type: integer
   *                       example: 5
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Parameter: categoryId is required."
   *       401:
   *         description: Unauthorized
   */
  router.post('/get-sub-categories-by-category-id', isAuthenticated, validate(getSubCategoriesByCategoryIdSchema), getSubCategoriesByCategoryId);

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
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID (optional)
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID (optional)
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
  /**
   * @swagger
   * /get-sub-category-details/{subCategoryId}:
   *   get:
   *     summary: Get detailed subcategory information
   *     tags: [SubCategories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: subCategoryId
   *         required: true
   *         schema:
   *           type: integer
   *         description: SubCategory ID
   *     responses:
   *       200:
   *         description: SubCategory details retrieved successfully
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
   *                     category:
   *                       type: object
   *                     statistics:
   *                       type: object
   *                       properties:
   *                         product_count:
   *                           type: integer
   *                     products:
   *                       type: array
   *                       items:
   *                         type: object
   *       404:
   *         description: SubCategory not found
   */
  router.get('/get-sub-category-details/:subCategoryId', isAuthenticated, getSubCategoryDetails);

  /**
   * @swagger
   * /get-sub-category-stats:
   *   post:
   *     summary: Get sub-category statistics and reports
   *     tags: [SubCategories]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - subCategoryId
   *             properties:
   *               subCategoryId:
   *                 type: integer
   *                 example: 1
   *                 description: SubCategory ID (required)
   *               startDate:
   *                 type: string
   *                 format: date
   *                 example: "2025-12-01"
   *                 description: Start date for revenue calculation (optional, ISO format)
   *               endDate:
   *                 type: string
   *                 format: date
   *                 example: "2026-01-31"
   *                 description: End date for revenue calculation (optional, ISO format)
   *     responses:
   *       200:
   *         description: Sub-category statistics retrieved successfully
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
   *                     sub_category_id:
   *                       type: integer
   *                       example: 1
   *                     sub_category_title:
   *                       type: string
   *                       example: "Smartphones"
   *                     total_products:
   *                       type: integer
   *                       example: 45
   *                       description: Total number of products in this sub-category
   *                     active_products:
   *                       type: integer
   *                       example: 38
   *                       description: Number of active products in this sub-category
   *                     total_revenue:
   *                       type: number
   *                       example: 8500000
   *                       description: Total revenue from delivered orders (in paise/cents)
   *                     out_of_stock:
   *                       type: integer
   *                       example: 7
   *                       description: Number of out-of-stock product variants
   *                     charts:
   *                       type: object
   *                       description: Chart data for visual analytics
   *                       properties:
   *                         product_status_distribution:
   *                           type: object
   *                           description: Product Status Distribution (Pie Chart data)
   *                           properties:
   *                             active:
   *                               type: integer
   *                               example: 38
   *                               description: Number of active products
   *                             inactive:
   *                               type: integer
   *                               example: 7
   *                               description: Number of inactive products
   *                         stock_status_distribution:
   *                           type: object
   *                           description: Stock Status Distribution (Bar Chart data)
   *                           properties:
   *                             in_stock:
   *                               type: integer
   *                               example: 32
   *                               description: Number of products/variants in stock
   *                             low_stock:
   *                               type: integer
   *                               example: 6
   *                               description: Number of products/variants with low stock (quantity <= 10)
   *                             out_of_stock:
   *                               type: integer
   *                               example: 7
   *                               description: Number of products/variants out of stock
   *       400:
   *         description: Validation error
   *       404:
   *         description: SubCategory not found
   */
  router.post('/get-sub-category-stats', isAuthenticated, validate(getSubCategoryStatsSchema), getSubCategoryStats);

  router.patch(
    '/update-sub-category/:id',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(updateSubCategorySchema),
    updateSubCategory,
  );
};
