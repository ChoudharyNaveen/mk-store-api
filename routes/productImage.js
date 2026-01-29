const multer = require('multer');
const {
  saveProductImages,
  updateProductImage,
  deleteProductImage,
  getProductImages,
} = require('../controllers/productImageController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveProductImages: saveProductImagesSchema,
  updateProductImage: updateProductImageSchema,
  getProductImages: getProductImagesSchema,
} = require('../schemas');

const upload = multer();

module.exports = (router) => {
  /**
   * @swagger
   * /save-product-images:
   *   post:
   *     summary: Upload multiple product images
   *     tags: [Product Images, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - productId
   *               - files
   *             properties:
   *               productId:
   *                 type: integer
   *                 example: 1
   *               variantId:
   *                 type: integer
   *                 example: 5
   *               files:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 description: Image files (max 10 images)
   *     responses:
   *       201:
   *         description: Product images uploaded successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-product-images',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([ { name: 'files', maxCount: 10 } ]),
    validate(saveProductImagesSchema),
    saveProductImages,
  );

  /**
   * @swagger
   * /get-product-images:
   *   post:
   *     summary: Get product images with pagination
   *     tags: [Product Images, ADMIN]
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
   *               variantId:
   *                 type: integer
   *                 example: 5
   *               pageSize:
   *                 type: integer
   *                 enum: [1, 5, 10, 20, 30, 40, 50, 100, 500]
   *                 default: 10
   *               pageNumber:
   *                 type: integer
   *                 minimum: 1
   *                 default: 1
   *     responses:
   *       200:
   *         description: Product images retrieved successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/get-product-images',
    isAuthenticated,
    validate(getProductImagesSchema),
    getProductImages,
  );

  /**
   * @swagger
   * /update-product-image/{id}:
   *   post:
   *     summary: Update product image (is_default, display_order)
   *     tags: [Product Images, ADMIN]
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
   *               isDefault:
   *                 type: boolean
   *               displayOrder:
   *                 type: integer
   *               concurrencyStamp:
   *                 type: string
   *     responses:
   *       200:
   *         description: Product image updated successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Concurrency error
   */
  router.post(
    '/update-product-image/:id',
    isAuthenticated,
    isVendorAdmin,
    validate(updateProductImageSchema),
    updateProductImage,
  );

  /**
   * @swagger
   * /delete-product-image/{id}:
   *   post:
   *     summary: Delete product image (soft delete)
   *     tags: [Product Images, ADMIN]
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
   *         description: Product image deleted successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/delete-product-image/:id',
    isAuthenticated,
    isVendorAdmin,
    deleteProductImage,
  );
};
