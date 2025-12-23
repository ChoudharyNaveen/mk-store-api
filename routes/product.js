const {
  saveProduct,
  getProduct,
  updateProduct,
  getProductsGroupedByCategory,
  deleteProduct
} = require('../controllers/productController')
const { isAuthenticated } = require('../middleware/auth')
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
   *               - name
   *               - price
   *               - categoryId
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Wireless Headphones"
   *               description:
   *                 type: string
   *                 example: "High-quality wireless headphones with noise cancellation"
   *               price:
   *                 type: number
   *                 format: float
   *                 example: 99.99
   *               categoryId:
   *                 type: string
   *                 example: "category-uuid"
   *               subCategoryId:
   *                 type: string
   *                 example: "subcategory-uuid"
   *               stock:
   *                 type: integer
   *                 example: 100
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Product image file
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
   *                     publicId:
   *                       type: string
   *                     name:
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
   *                       publicId:
   *                         type: string
   *                       name:
   *                         type: string
   *                       price:
   *                         type: number
   *                       description:
   *                         type: string
   *                 count:
   *                   type: integer
   *                   example: 50
   */
  router.get('/get-product', isAuthenticated, getProduct)

  /**
   * @swagger
   * /update-product/{publicId}:
   *   patch:
   *     summary: Update a product
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Product public ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Updated Product Name"
   *               price:
   *                 type: number
   *                 example: 129.99
   *               description:
   *                 type: string
   *               stock:
   *                 type: integer
   *               file:
   *                 type: string
   *                 format: binary
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
    '/update-product/:publicId',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
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
   *                         publicId:
   *                           type: string
   *                         name:
   *                           type: string
   *                         price:
   *                           type: number
   */
  router.get(
    '/get-products-by-category',
    isAuthenticated,
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
  router.delete('/delete-product', isAuthenticated, deleteProduct)
}
