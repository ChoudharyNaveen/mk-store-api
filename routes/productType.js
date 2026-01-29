const {
  saveProductType,
  getProductType,
  updateProductType,
} = require('../controllers/productTypeController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveProductType: saveProductTypeSchema,
  getProductType: getProductTypeSchema,
  updateProductType: updateProductTypeSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /save-product-type:
   *   post:
   *     summary: Create a new product type (e.g. Groundnut Oil under Oil and ghee subcategory)
   *     tags: [Product Types, ADMIN]
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
   *               - title
   *             properties:
   *               subCategoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Subcategory ID
   *               title:
   *                 type: string
   *                 example: "Groundnut Oil"
   *                 description: Product type title (unique per subcategory)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 default: ACTIVE
   *     responses:
   *       201:
   *         description: Product type created successfully
   *       400:
   *         description: Validation error or duplicate title for subcategory
   */
  router.post('/save-product-type', isAuthenticated, isVendorAdmin, validate(saveProductTypeSchema), saveProductType);

  /**
   * @swagger
   * /get-product-type:
   *   post:
   *     summary: Get product types with pagination and filters
   *     tags: [Product Types, ADMIN]
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
   *                   properties:
   *                     key:
   *                       type: string
   *                     eq:
   *                       type: string
   *                     in:
   *                       type: array
   *                       items:
   *                         type: string
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
   *     responses:
   *       200:
   *         description: Product types retrieved successfully
   */
  router.post('/get-product-type', isAuthenticated, isVendorAdmin, validate(getProductTypeSchema), getProductType);

  /**
   * @swagger
   * /update-product-type/{id}:
   *   patch:
   *     summary: Update a product type
   *     tags: [Product Types, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *       - in: header
   *         name: x-concurrencystamp
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - updatedBy
   *               - concurrencyStamp
   *             properties:
   *               title:
   *                 type: string
   *                 example: "Groundnut Oil"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *               updatedBy:
   *                 type: integer
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *     responses:
   *       200:
   *         description: Product type updated successfully
   *       409:
   *         description: Concurrency conflict
   */
  router.patch('/update-product-type/:id', isAuthenticated, isVendorAdmin, validate(updateProductTypeSchema), updateProductType);
};
