const {
  saveAddress,
  getAddress,
  updateAddress,
} = require('../controllers/addressController')
const { isAuthenticated } = require('../middleware/auth')

module.exports = (router) => {
  /**
   * @swagger
   * /save-address:
   *   post:
   *     summary: Add a new address
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - house_no
   *               - streetDetails
   *               - landmark
   *               - name
   *               - mobileNumber
   *             properties:
   *               house_no:
   *                 type: string
   *                 example: "123"
   *               streetDetails:
   *                 type: string
   *                 example: "Main Street"
   *               landmark:
   *                 type: string
   *                 example: "Near City Park"
   *               name:
   *                 type: string
   *                 example: "John Doe"
   *               mobileNumber:
   *                 type: string
   *                 example: "+1234567890"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *     responses:
   *       200:
   *         description: Address saved successfully
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
   *                   example: "Address saved successfully"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     publicId:
   *                       type: string
   *                     house_no:
   *                       type: string
   *                     streetDetails:
   *                       type: string
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-address',
    isAuthenticated,
    saveAddress
  )

  /**
   * @swagger
   * /get-address:
   *   get:
   *     summary: Get user addresses
   *     tags: [Addresses]
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
   *         description: Addresses retrieved successfully
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
   *                       house_no:
   *                         type: string
   *                       streetDetails:
   *                         type: string
   *                       landmark:
   *                         type: string
   *                       name:
   *                         type: string
   *                       mobileNumber:
   *                         type: string
   *                 count:
   *                   type: integer
   */
  router.get('/get-address', isAuthenticated, getAddress)

  /**
   * @swagger
   * /update-address/{publicId}:
   *   patch:
   *     summary: Update an address
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: Address public ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               house_no:
   *                 type: string
   *               streetDetails:
   *                 type: string
   *               landmark:
   *                 type: string
   *               name:
   *                 type: string
   *               mobileNumber:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *     responses:
   *       200:
   *         description: Address updated successfully
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
    '/update-address/:publicId',
    isAuthenticated,
    updateAddress
  )
}
