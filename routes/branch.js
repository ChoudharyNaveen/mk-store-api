const {
  saveBranch,
  getBranch,
  updateBranch,
} = require('../controllers/branchController')
const { isAuthenticated } = require('../middleware/auth')
const validate = require('../middleware/validation')
const {
  saveBranch: saveBranchSchema,
  getBranch: getBranchSchema,
  updateBranch: updateBranchSchema,
} = require('../schemas')

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
   *               - address
   *             properties:
   *               vendorId:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *               name:
   *                 type: string
   *                 example: "Downtown Branch"
   *               address:
   *                 type: string
   *                 example: "456 Oak Ave"
   *               phone:
   *                 type: string
   *                 example: "+1234567890"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "branch@example.com"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *     responses:
   *       200:
   *         description: Branch created successfully
   */
  router.post('/save-branch', isAuthenticated, validate(saveBranchSchema), saveBranch)

  /**
   * @swagger
   * /get-branch:
   *   get:
   *     summary: Get branches with pagination
   *     tags: [Branches]
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
   *         description: Branches retrieved successfully
   */
  router.get('/get-branch', isAuthenticated, validate(getBranchSchema), getBranch)

  /**
   * @swagger
   * /update-branch/{publicId}:
   *   patch:
   *     summary: Update a branch
   *     tags: [Branches]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Branch public ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               vendorId:
   *                 type: string
   *                 format: uuid
   *               name:
   *                 type: string
   *               address:
   *                 type: string
   *               phone:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *     responses:
   *       200:
   *         description: Branch updated successfully
   */
  router.patch('/update-branch/:publicId', isAuthenticated, validate(updateBranchSchema), updateBranch)
}

