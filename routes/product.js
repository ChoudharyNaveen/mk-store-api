const {
  saveProduct,
  getProduct,
  updateProduct,
  getProductsGroupedByCategory,
  deleteProduct
} = require('../controllers/productController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  saveProduct: saveProductSchema,
  getProduct: getProductSchema,
  updateProduct: updateProductSchema,
  getProductsGroupedByCategory: getProductsGroupedByCategorySchema,
  deleteProduct: deleteProductSchema,
} = require('../schemas')
const multer = require('multer')
const upload = multer()

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
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(saveProductSchema),
    saveProduct
  )

  /**
   * @swagger
   * /get-product:
   *   get:
   *     summary: Get products with pagination and filters
   *     tags: [Products]
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
  router.get('/get-product', isAuthenticated, validate(getProductSchema), getProduct)

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
    upload.fields([{ name: 'file', maxCount: 1 }]),
    validate(updateProductSchema),
    updateProduct
  )

  /**
   * @swagger
   * /get-products-by-category:
   *   get:
   *     summary: Get products grouped by category
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
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
  router.get(
    '/get-products-by-category',
    isAuthenticated,
    validate(getProductsGroupedByCategorySchema),
    getProductsGroupedByCategory
  )

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
  router.delete('/delete-product', isAuthenticated, validate(deleteProductSchema), deleteProduct)
}
