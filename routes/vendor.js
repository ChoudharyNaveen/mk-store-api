const {
  saveVendor,
  getVendor,
  updateVendor,
  getVendorByCode,
} = require('../controllers/vendorController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveVendor: saveVendorSchema,
  getVendor: getVendorSchema,
  updateVendor: updateVendorSchema,
  getVendorByCode: getVendorByCodeSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /save-vendor:
   *   post:
   *     summary: Create a new vendor with branch
   *     tags: [Vendors, ADMIN]
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
   *               - branchName
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
   *               code:
   *                 type: string
   *                 example: "VENDOR001"
   *                 description: Unique vendor code (optional)
   *               address:
   *                 type: string
   *                 example: "123 Main St"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *               branchName:
   *                 type: string
   *                 example: "Main Branch"
   *                 description: Branch name (required)
   *               branchCode:
   *                 type: string
   *                 example: "BRANCH001"
   *                 description: Unique branch code (optional)
   *               addressLine1:
   *                 type: string
   *                 example: "123 Main Street"
   *                 description: Address line 1 (optional)
   *               addressLine2:
   *                 type: string
   *                 example: "Suite 100"
   *                 description: Address line 2 (optional)
   *               street:
   *                 type: string
   *                 example: "Main Street"
   *                 description: Street name (optional)
   *               city:
   *                 type: string
   *                 example: "New York"
   *                 description: City (optional)
   *               state:
   *                 type: string
   *                 example: "NY"
   *                 description: State (optional)
   *               pincode:
   *                 type: string
   *                 example: "10001"
   *                 description: Pincode/ZIP code (optional)
   *               latitude:
   *                 type: number
   *                 example: 40.7128
   *                 description: Latitude coordinate (optional)
   *               longitude:
   *                 type: number
   *                 example: -74.0060
   *                 description: Longitude coordinate (optional)
   *               branchPhone:
   *                 type: string
   *                 example: "+1234567890"
   *                 description: Branch phone number (optional)
   *               branchEmail:
   *                 type: string
   *                 format: email
   *                 example: "branch@example.com"
   *                 description: Branch email (optional)
   *               branchStatus:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Branch status (optional, defaults to ACTIVE)
   *     responses:
   *       200:
   *         description: Vendor and branch created successfully
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
   *                   example: "successfully added"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     vendor:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: integer
   *                         name:
   *                           type: string
   *                         email:
   *                           type: string
   *                         mobile_number:
   *                           type: string
   *                         code:
   *                           type: string
   *                         status:
   *                           type: string
   *                           enum: [ACTIVE, INACTIVE]
   *                     branch:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: integer
   *                         vendor_id:
   *                           type: integer
   *                         name:
   *                           type: string
   *                         code:
   *                           type: string
   *                         address_line1:
   *                           type: string
   *                         address_line2:
   *                           type: string
   *                         street:
   *                           type: string
   *                         city:
   *                           type: string
   *                         state:
   *                           type: string
   *                         pincode:
   *                           type: string
   *                         latitude:
   *                           type: number
   *                         longitude:
   *                           type: number
   *                         phone:
   *                           type: string
   *                         email:
   *                           type: string
   *                         status:
   *                           type: string
   *                           enum: [ACTIVE, INACTIVE]
   *       400:
   *         description: Bad request - validation error or duplicate code
   */
  router.post('/save-vendor', isAuthenticated, isVendorAdmin, validate(saveVendorSchema), saveVendor);

  /**
   * @swagger
   * /get-vendor:
   *   post:
   *     summary: Get vendors with pagination
   *     tags: [Vendors, ADMIN]
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
   *         description: Vendors retrieved successfully
   */
  router.post('/get-vendor', isAuthenticated, validate(getVendorSchema), getVendor);

  /**
   * @swagger
   * /update-vendor/{id}:
   *   patch:
   *     summary: Update a vendor
   *     tags: [Vendors, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Vendor ID
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
  router.patch('/update-vendor/:id', isAuthenticated, validate(updateVendorSchema), updateVendor);

  /**
   * @swagger
   * /get-vendor-by-code:
   *   get:
   *     summary: Get vendor details by code (Public API)
   *     tags: [Vendors, CLIENT]
   *     parameters:
   *       - in: query
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: Vendor code
   *     responses:
   *       200:
   *         description: Vendor retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 doc:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     name:
   *                       type: string
   *                       example: "ABC Vendor"
   *                     email:
   *                       type: string
   *                       example: "vendor@example.com"
   *                     mobile_number:
   *                       type: string
   *                       example: "+1234567890"
   *                     code:
   *                       type: string
   *                       example: "VENDOR001"
   *                     address:
   *                       type: string
   *                       example: "123 Main St"
   *                     status:
   *                       type: string
   *                       enum: [ACTIVE, INACTIVE]
   *                       example: ACTIVE
   *                     concurrency_stamp:
   *                       type: string
   *                       format: uuid
   *                       example: "123e4567-e89b-12d3-a456-426614174000"
   *                     created_at:
   *                       type: string
   *                       format: date-time
   *                     updated_at:
   *                       type: string
   *                       format: date-time
   *       404:
   *         description: Vendor not found
   */
  router.get('/get-vendor-by-code', validate(getVendorByCodeSchema), getVendorByCode);
};
