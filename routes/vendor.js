const {
  saveVendor,
  getVendor,
  updateVendor,
} = require('../controllers/vendorController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  saveVendor: saveVendorSchema,
  getVendor: getVendorSchema,
  updateVendor: updateVendorSchema,
} = require('../schemas')

module.exports = (router) => {
  /**
   * @swagger
   * /save-vendor:
   *   post:
   *     summary: Create a new vendor
   *     tags: [Vendors]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - mobile_number
   *             properties:
   *               name:
   *                 type: string
   *                 example: "ABC Vendor"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "vendor@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               address:
   *                 type: string
   *                 example: "123 Main St"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *     responses:
   *       200:
   *         description: Vendor created successfully
   */
  router.post('/save-vendor', isAuthenticated, validate(saveVendorSchema), saveVendor)

  /**
   * @swagger
   * /get-vendor:
   *   get:
   *     summary: Get vendors with pagination
   *     tags: [Vendors]
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
   *         description: Vendors retrieved successfully
   */
  router.get('/get-vendor', isAuthenticated, validate(getVendorSchema), getVendor)

  /**
   * @swagger
   * /update-vendor/{publicId}:
   *   patch:
   *     summary: Update a vendor
   *     tags: [Vendors]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Vendor public ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               mobile_number:
   *                 type: string
   *               address:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *     responses:
   *       200:
   *         description: Vendor updated successfully
   */
  router.patch('/update-vendor/:publicId', isAuthenticated, validate(updateVendorSchema), updateVendor)
}

