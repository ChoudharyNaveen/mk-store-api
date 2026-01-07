const {
  saveAddress,
  getAddress,
  updateAddress,
} = require('../controllers/addressController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveAddress: saveAddressSchema,
  getAddress: getAddressSchema,
  updateAddress: updateAddressSchema,
} = require('../schemas');

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
   *               - city
   *               - state
   *               - postal_code
   *               - name
   *               - mobileNumber
   *             properties:
   *               house_no:
   *                 type: string
   *                 example: "123"
   *               address_line_2:
   *                 type: string
   *                 example: "Apartment 4B"
   *               streetDetails:
   *                 type: string
   *                 example: "Main Street"
   *               landmark:
   *                 type: string
   *                 example: "Near City Park"
   *               city:
   *                 type: string
   *                 example: "Mumbai"
   *               state:
   *                 type: string
   *                 example: "Maharashtra"
   *               country:
   *                 type: string
   *                 example: "India"
   *               postal_code:
   *                 type: string
   *                 example: "400001"
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
   *                     id:
   *                       type: integer
   *                       example: 1
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
    validate(saveAddressSchema),
    saveAddress,
  );

  /**
   * @swagger
   * /get-address:
   *   post:
   *     summary: Get user addresses
   *     tags: [Addresses]
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
   *                       id:
   *                         type: integer
   *                         example: 1
   *                       house_no:
   *                         type: string
   *                       address_line_2:
   *                         type: string
   *                       streetDetails:
   *                         type: string
   *                       landmark:
   *                         type: string
   *                       city:
   *                         type: string
   *                       state:
   *                         type: string
   *                       country:
   *                         type: string
   *                       postal_code:
   *                         type: string
   *                       name:
   *                         type: string
   *                       mobileNumber:
   *                         type: string
   *                 count:
   *                   type: integer
   */
  router.post('/get-address', isAuthenticated, validate(getAddressSchema), getAddress);

  /**
   * @swagger
   * /update-address/{id}:
   *   patch:
   *     summary: Update an address
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Address ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               house_no:
   *                 type: string
   *               address_line_2:
   *                 type: string
   *               streetDetails:
   *                 type: string
   *               landmark:
   *                 type: string
   *               city:
   *                 type: string
   *               state:
   *                 type: string
   *               country:
   *                 type: string
   *               postal_code:
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
    '/update-address/:id',
    isAuthenticated,
    validate(updateAddressSchema),
    updateAddress,
  );
};
