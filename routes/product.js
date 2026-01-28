/* eslint-disable max-len */
const multer = require('multer');
const {
  saveProduct,
  getProduct,
  updateProduct,
  getProductsGroupedByCategory,
  getProductDetails,
  deleteProduct,
  getProductStats,
} = require('../controllers/productController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveProduct: saveProductSchema,
  getProduct: getProductSchema,
  updateProduct: updateProductSchema,
  getProductsGroupedByCategory: getProductsGroupedByCategorySchema,
  deleteProduct: deleteProductSchema,
  getProductStats: getProductStatsSchema,
} = require('../schemas');

const upload = multer();

module.exports = (router) => {
  /**
   * @swagger
   * /save-product:
   *   post:
   *     summary: Create a new product
   *     tags: [Products]
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
   *               - categoryId
   *               - vendorId
   *               - branchId
   *               - variants
   *             properties:
   *               title:
   *                 type: string
   *                 example: "Wireless Headphones"
   *                 description: Product title (required)
   *               categoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Category ID (required)
   *               subCategoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Subcategory ID (optional)
   *               brandId:
   *                 type: integer
   *                 nullable: true
   *                 example: 1
   *                 description: Brand ID (optional, can be null)
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
   *                 description: Product status (optional, defaults to ACTIVE)
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 description: Multiple product image files (optional, max 3 images per product)
   *               variants:
   *                 type: string
   *                 description: "JSON string array of variant objects (REQUIRED - at least one variant). Each variant must include: variantName (required), description (optional), nutritional (optional), price (required), sellingPrice (required), quantity (required), itemsPerUnit (optional), units (optional), itemQuantity (optional), itemUnit (optional), expiryDate (required), status (optional), comboDiscounts (optional array). Each comboDiscount object includes: comboQuantity (required), discountType (required: PERCENT or FLATOFF), discountValue (required), startDate (required), endDate (required), status (optional)"
   *                 example: '[{"variantName":"500g","description":"Fresh product","nutritional":"Calories: 100","price":500,"sellingPrice":450,"quantity":100,"itemsPerUnit":2,"units":"PCS","expiryDate":"2024-12-31","status":"ACTIVE","comboDiscounts":[{"comboQuantity":2,"discountType":"PERCENT","discountValue":10,"startDate":"2024-01-01","endDate":"2024-12-31","status":"ACTIVE"}]}]'
   *     responses:
   *       200:
   *         description: Product created successfully
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
   *                   example: "Product created successfully"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     title:
   *                       type: string
   *                     price:
   *                       type: number
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-product',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([
      { name: 'images', maxCount: 10 }, // Multiple images (max 10 per product)
    ]),
    validate(saveProductSchema),
    saveProduct,
  );

  /**
   * @swagger
   * /get-product:
   *   post:
   *     summary: Get products with pagination and filters
   *     tags: [Products]
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
   *         description: Products retrieved successfully
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
   *                       price:
   *                         type: number
   *                 count:
   *                   type: integer
   *                   example: 50
   */
  router.post('/get-product', isAuthenticated, validate(getProductSchema), getProduct);

  /**
   * @swagger
   * /update-product/{id}:
   *   patch:
   *     summary: Update a product
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Product ID
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
   *                 example: "Updated Product Name"
   *                 description: Product title (optional)
   *               categoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Category ID (optional)
   *               subCategoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Subcategory ID (optional)
   *               brandId:
   *                 type: integer
   *                 nullable: true
   *                 example: 1
   *                 description: Brand ID (optional, can be null)
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
   *                 description: Product status (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the product (required)
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response (required)
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 description: Multiple product image files (optional, max 3 images per product)
   *               variants:
   *                 type: string
   *                 description: "JSON string array of variant objects (optional). For updates include id and concurrencyStamp. For new omit id. Each variant must include: variantName (required), description (optional), nutritional (optional), price (required), sellingPrice (required), quantity (required), itemsPerUnit (optional), units (optional), itemQuantity (optional), itemUnit (optional), expiryDate (required), status (optional), comboDiscounts (optional array). For comboDiscounts: include id and concurrencyStamp for updates, omit id for creates, set deleted:true for deletes. At least one variant must remain after all operations. discountType supports PERCENT or FLATOFF."
   *                 example: '[{"id":1,"variantName":"500g","description":"Fresh product","nutritional":"Calories: 100","price":500,"sellingPrice":450,"quantity":100,"itemsPerUnit":2,"units":"PCS","expiryDate":"2024-12-31","concurrencyStamp":"stamp","status":"ACTIVE","comboDiscounts":[{"id":10,"concurrencyStamp":"cd-stamp","comboQuantity":3,"discountType":"PERCENT","discountValue":15,"startDate":"2024-01-01","endDate":"2024-12-31"},{"comboQuantity":10,"discountType":"PERCENT","discountValue":20,"startDate":"2024-01-01","endDate":"2024-12-31"},{"id":11,"deleted":true}]},{"variantName":"1kg","description":"Fresh product","nutritional":"Calories: 200","price":900,"sellingPrice":800,"quantity":50,"itemsPerUnit":1,"units":"PCS","expiryDate":"2024-12-31","status":"ACTIVE"}]'
   *               variantIdsToDelete:
   *                 type: string
   *                 description: "JSON string array of variant IDs to delete (optional). Example: '[2,3]'. Note: At least one variant must remain after deletion."
   *                 example: '[2,3]'
   *               imagesData:
   *                 type: string
   *                 description: "JSON string array of image objects (optional). For updates include id and concurrencyStamp. For new include imageUrl. Each image can include: id (optional for updates), imageUrl (required for new), isDefault (optional), displayOrder (optional), variantId (optional), status (optional), concurrencyStamp (required for updates)"
   *                 example: '[{"id":1,"isDefault":true,"displayOrder":1,"concurrencyStamp":"stamp"},{"imageUrl":"https://example.com/new.jpg","isDefault":false,"displayOrder":2}]'
   *               imageIdsToDelete:
   *                 type: string
   *                 description: "JSON string array of image IDs to delete (optional). Example: '[4,5]'"
   *                 example: '[4,5]'
   *     responses:
   *       200:
   *         description: Product updated successfully
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
    '/update-product/:id',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([
      { name: 'images', maxCount: 3 }, // Multiple images (max 3 per product)
    ]),
    validate(updateProductSchema),
    updateProduct,
  );

  /**
   * @swagger
   * /get-products-by-category:
   *   post:
   *     summary: Get products grouped by category
   *     tags: [Products]
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
   *     responses:
   *       200:
   *         description: Products grouped by category
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
   *                   additionalProperties:
   *                     type: array
   *                     items:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: integer
   *                           example: 1
   *                         title:
   *                           type: string
   *                         price:
   *                           type: number
   */
  router.post(
    '/get-products-by-category',
    isAuthenticated,
    validate(getProductsGroupedByCategorySchema),
    getProductsGroupedByCategory,
  );

  /**
   * @swagger
   * /delete-product:
   *   delete:
   *     summary: Delete a product
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *         description: Product ID to delete
   *     responses:
   *       200:
   *         description: Product deleted successfully
   *         headers:
   *           message:
   *             schema:
   *               type: string
   *             example: "Product deleted successfully"
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       400:
   *         description: Error deleting product
   */
  /**
   * @swagger
   * /get-product-details/{productId}:
   *   get:
   *     summary: Get detailed product information
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Product ID
   *     responses:
   *       200:
   *         description: Product details retrieved successfully. Each variant's comboDiscounts entries include discount_price (discounted price for ONE combo set).
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
   *                     price:
   *                       type: number
   *                     selling_price:
   *                       type: number
   *                     image:
   *                       type: string
   *                     category:
   *                       type: object
   *                     subCategory:
   *                       type: object
   *                     brand:
   *                       type: object
   *                     statistics:
   *                       type: object
   *                       properties:
   *                         cart_count:
   *                           type: integer
   *                         wishlist_count:
   *                           type: integer
   *                         order_count:
   *                           type: integer
   *                     related_products:
   *                       type: array
   *                       items:
   *                         type: object
   *       404:
   *         description: Product not found
   */
  router.get('/get-product-details/:productId', isAuthenticated, getProductDetails);

  /**
   * @swagger
   * /get-product-stats:
   *   post:
   *     summary: Get product statistics
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - productId
   *             properties:
   *               productId:
   *                 type: integer
   *                 example: 1
   *                 description: Product ID
   *     responses:
   *       200:
   *         description: Product statistics retrieved successfully
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
   *                     product_id:
   *                       type: integer
   *                       example: 1
   *                     product_title:
   *                       type: string
   *                       example: "Wireless Headphones"
   *                     total_orders:
   *                       type: integer
   *                       example: 156
   *                       description: Total number of orders for this product
   *                     units_sold:
   *                       type: integer
   *                       example: 234
   *                       description: Total units sold
   *                     revenue_generated:
   *                       type: number
   *                       example: 23400000
   *                       description: Total revenue generated in base currency
   *                     current_stock:
   *                       type: integer
   *                       example: 0
   *                       description: Current stock available (sum of all variant quantities)
   *       404:
   *         description: Product not found
   */
  router.post('/get-product-stats', isAuthenticated, validate(getProductStatsSchema), getProductStats);

  router.delete('/delete-product', isAuthenticated, validate(deleteProductSchema), deleteProduct);
};
