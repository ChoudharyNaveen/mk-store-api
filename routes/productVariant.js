const {
  saveProductVariant,
  updateProductVariant,
  getProductVariants,
  getVariantById,
  deleteProductVariant,
  getVariantsByType,
} = require('../controllers/productVariantController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveProductVariant: saveProductVariantSchema,
  updateProductVariant: updateProductVariantSchema,
  getProductVariants: getProductVariantsSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /save-product-variant:
   *   post:
   *     summary: Create a new product variant
   *     tags: [Product Variants]
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
   *               - variantName
   *               - price
   *               - sellingPrice
   *               - quantity
   *             properties:
   *               productId:
   *                 type: integer
   *                 example: 1
   *               variantName:
   *                 type: string
   *                 example: "500g"
   *               price:
   *                 type: number
   *                 example: 500
   *               sellingPrice:
   *                 type: number
   *                 example: 450
   *               quantity:
   *                 type: integer
   *                 example: 100
   *               itemQuantity:
   *                 type: number
   *                 example: 0.5
   *               itemUnit:
   *                 type: string
   *                 enum: [KG, G, LTR, ML, etc.]
   *                 example: KG
   *               expiryDate:
   *                 type: string
   *                 format: date
   *                 example: "2024-12-31"
   *                 description: Variant expiry date (required)
   *     responses:
   *       201:
   *         description: Product variant created successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-product-variant',
    isAuthenticated,
    isVendorAdmin,
    validate(saveProductVariantSchema),
    saveProductVariant,
  );

  /**
   * @swagger
   * /get-product-variants:
   *   post:
   *     summary: Get product variants with pagination and filtering
   *     tags: [Product Variants]
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
   *               sorting:
   *                 type: array
   *     responses:
   *       200:
   *         description: Product variants retrieved successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/get-product-variants',
    isAuthenticated,
    validate(getProductVariantsSchema),
    getProductVariants,
  );

  /**
   * @swagger
   * /get-variant-by-id/{variantId}:
   *   get:
   *     summary: Get product variant by ID
   *     tags: [Product Variants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: variantId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Product variant retrieved successfully
   *       404:
   *         description: Variant not found
   */
  router.get(
    '/get-variant-by-id/:variantId',
    isAuthenticated,
    getVariantById,
  );

  /**
   * @swagger
   * /update-product-variant/{id}:
   *   post:
   *     summary: Update product variant
   *     tags: [Product Variants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - concurrencyStamp
   *             properties:
   *               variantName:
   *                 type: string
   *               price:
   *                 type: number
   *               sellingPrice:
   *                 type: number
   *               quantity:
   *                 type: integer
   *               expiryDate:
   *                 type: string
   *                 format: date
   *                 example: "2024-12-31"
   *                 description: Variant expiry date (optional)
   *               concurrencyStamp:
   *                 type: string
   *     responses:
   *       200:
   *         description: Product variant updated successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Concurrency error
   */
  router.post(
    '/update-product-variant/:id',
    isAuthenticated,
    isVendorAdmin,
    validate(updateProductVariantSchema),
    updateProductVariant,
  );

  /**
   * @swagger
   * /delete-product-variant/{id}:
   *   post:
   *     summary: Delete product variant (soft delete)
   *     tags: [Product Variants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Product variant deleted successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/delete-product-variant/:id',
    isAuthenticated,
    isVendorAdmin,
    deleteProductVariant,
  );

  /**
   * @swagger
   * /get-variants-by-type/{productId}:
   *   get:
   *     summary: Get product variants grouped by type
   *     tags: [Product Variants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Variants grouped by type
   *       400:
   *         description: Validation error
   */
  /**
   * @swagger
   * /get-variants-by-type/{productId}:
   *   get:
   *     summary: Get product variants grouped by type
   *     tags: [Product Variants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Variants grouped by type
   *       400:
   *         description: Validation error
   */
  router.get(
    '/get-variants-by-type/:productId',
    isAuthenticated,
    getVariantsByType,
  );
};
