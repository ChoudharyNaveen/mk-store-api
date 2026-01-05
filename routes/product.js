const multer = require('multer');
const {
  saveProduct,
  getProduct,
  updateProduct,
  getProductsGroupedByCategory,
  getProductDetails,
  deleteProduct,
} = require('../controllers/productController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveProduct: saveProductSchema,
  getProduct: getProductSchema,
  updateProduct: updateProductSchema,
  getProductsGroupedByCategory: getProductsGroupedByCategorySchema,
  deleteProduct: deleteProductSchema,
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
   *               - description
   *               - price
   *               - categoryId
   *               - vendorId
   *               - branchId
   *             properties:
   *               title:
   *                 type: string
   *                 example: "Wireless Headphones"
   *                 description: Product title (required)
   *               description:
   *                 type: string
   *                 example: "High-quality wireless headphones with noise cancellation"
   *                 description: Product description (required)
   *               price:
   *                 type: number
   *                 format: integer
   *                 example: 9999
   *                 description: Product price in cents (required)
   *               categoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Category ID (required)
   *               subCategoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Subcategory ID (optional)
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
   *               quantity:
   *                 type: integer
   *                 example: 2
   *                 description: Number of units in stock (required)
   *               itemsPerUnit:
   *                 type: integer
   *                 example: 25
   *                 description: Number of items per unit (optional, e.g., 25 items per unit)
   *               expiryDate:
   *                 type: string
   *                 format: date
   *                 example: "2024-12-31"
   *                 description: Product expiry date (required)
   *               itemQuantity:
   *                 type: number
   *                 format: float
   *                 example: 500
   *                 description: Measurement quantity per item (optional, e.g., 500 for 500gm per item)
   *               itemUnit:
   *                 type: string
   *                 example: "G"
   *                 description: Measurement unit per item (e.g., LTR, KG, ML, G, PCS) (optional)
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Product image file (required)
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
    upload.fields([ { name: 'file', maxCount: 1 } ]),
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
   *                       description:
   *                         type: string
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
   *               description:
   *                 type: string
   *                 example: "Updated description"
   *                 description: Product description (optional)
   *               price:
   *                 type: number
   *                 format: integer
   *                 example: 12999
   *                 description: Product price in cents (optional)
   *               categoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Category ID (optional)
   *               subCategoryId:
   *                 type: integer
   *                 example: 1
   *                 description: Subcategory ID (optional)
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
   *               quantity:
   *                 type: integer
   *                 example: 2
   *                 description: Number of units in stock (optional)
   *               itemsPerUnit:
   *                 type: integer
   *                 example: 25
   *                 description: Number of items per unit (optional, e.g., 25 items per unit)
   *               expiryDate:
   *                 type: string
   *                 format: date
   *                 example: "2024-12-31"
   *                 description: Product expiry date (optional)
   *               itemQuantity:
   *                 type: number
   *                 format: float
   *                 example: 500
   *                 description: Measurement quantity per item (optional, e.g., 500 for 500gm per item)
   *               itemUnit:
   *                 type: string
   *                 example: "G"
   *                 description: Measurement unit per item (e.g., LTR, KG, ML, G, PCS) (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the product
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Product image file (optional)
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
    upload.fields([ { name: 'file', maxCount: 1 } ]),
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
   *         description: Product details retrieved successfully
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

  router.delete('/delete-product', isAuthenticated, validate(deleteProductSchema), deleteProduct);
};
