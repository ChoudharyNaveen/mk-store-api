const {
  saveBranch,
  getBranch,
  updateBranch,
} = require('../controllers/branchController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveBranch: saveBranchSchema,
  getBranch: getBranchSchema,
  updateBranch: updateBranchSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /save-branch:
   *   post:
   *     summary: Create a new branch
   *     tags: [Branches]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - vendorId
   *               - name
   *             properties:
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID
   *               name:
   *                 type: string
   *                 example: "Downtown Branch"
   *                 description: Branch name
   *               code:
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
   *               phone:
   *                 type: string
   *                 example: "+1234567890"
   *                 description: Branch phone number (optional)
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "branch@example.com"
   *                 description: Branch email (optional)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Branch status (optional, defaults to ACTIVE)
   *     responses:
   *       200:
   *         description: Branch created successfully
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
  router.post('/save-branch', isAuthenticated, validate(saveBranchSchema), saveBranch);

  /**
   * @swagger
   * /get-branch:
   *   post:
   *     summary: Get branches with pagination
   *     tags: [Branches]
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
   *         description: Branches retrieved successfully
   */
  router.post('/get-branch', isAuthenticated, validate(getBranchSchema), getBranch);

  /**
   * @swagger
   * /update-branch/{id}:
   *   patch:
   *     summary: Update a branch
   *     tags: [Branches]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Branch ID
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
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - updatedBy
   *               - concurrencyStamp
   *             properties:
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID (optional)
   *               name:
   *                 type: string
   *                 example: "Downtown Branch"
   *                 description: Branch name (optional)
   *               code:
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
   *               phone:
   *                 type: string
   *                 example: "+1234567890"
   *                 description: Branch phone number (optional)
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "branch@example.com"
   *                 description: Branch email (optional)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Branch status (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the branch
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response
   *     responses:
   *       200:
   *         description: Branch updated successfully
   *       409:
   *         description: Concurrency conflict - branch was modified by another user
   */
  router.patch('/update-branch/:id', isAuthenticated, validate(updateBranchSchema), updateBranch);
};
