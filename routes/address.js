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
   *               - name
   *               - mobileNumber
   *             properties:
   *               addressLine1:
   *                 type: string
   *                 example: "123"
   *                 description: Address line 1 (optional)
   *               addressLine2:
   *                 type: string
   *                 example: "Apartment 4B"
   *                 description: Address line 2 (optional)
   *               street:
   *                 type: string
   *                 example: "Main Street"
   *                 description: Street name (optional)
   *               landmark:
   *                 type: string
   *                 example: "Near City Park"
   *                 description: Landmark (optional)
   *               city:
   *                 type: string
   *                 example: "Mumbai"
   *                 description: City name (optional)
   *               state:
   *                 type: string
   *                 example: "Maharashtra"
   *                 description: State name (optional)
   *               country:
   *                 type: string
   *                 example: "India"
   *                 default: "India"
   *                 description: Country name (optional, defaults to India)
   *               pincode:
   *                 type: string
   *                 example: "400001"
   *                 description: Postal/PIN code (optional)
   *               latitude:
   *                 type: number
   *                 format: decimal
   *                 minimum: -90
   *                 maximum: 90
   *                 example: 19.0760
   *                 description: Latitude coordinate (optional)
   *               longitude:
   *                 type: number
   *                 format: decimal
   *                 minimum: -180
   *                 maximum: 180
   *                 example: 72.8777
   *                 description: Longitude coordinate (optional)
   *               name:
   *                 type: string
   *                 example: "John Doe"
   *                 description: Recipient name (required)
   *               mobileNumber:
   *                 type: string
   *                 example: "+1234567890"
   *                 description: Mobile number (required)
   *               phone:
   *                 type: string
   *                 example: "+1234567890"
   *                 description: Phone number (optional)
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "john.doe@example.com"
   *                 description: Email address (optional)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 default: ACTIVE
   *                 example: ACTIVE
   *                 description: Address status (optional)
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
   *                     addressLine1:
   *                       type: string
   *                     addressLine2:
   *                       type: string
   *                     street:
   *                       type: string
   *                     landmark:
   *                       type: string
   *                     city:
   *                       type: string
   *                     state:
   *                       type: string
   *                     country:
   *                       type: string
   *                     pincode:
   *                       type: string
   *                     latitude:
   *                       type: number
   *                     longitude:
   *                       type: number
   *                     name:
   *                       type: string
   *                     mobileNumber:
   *                       type: string
   *                     phone:
   *                       type: string
   *                     email:
   *                       type: string
   *                     status:
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
   *                       addressLine1:
   *                         type: string
   *                         example: "123"
   *                       addressLine2:
   *                         type: string
   *                         example: "Apartment 4B"
   *                       street:
   *                         type: string
   *                         example: "Main Street"
   *                       landmark:
   *                         type: string
   *                         example: "Near City Park"
   *                       city:
   *                         type: string
   *                         example: "Mumbai"
   *                       state:
   *                         type: string
   *                         example: "Maharashtra"
   *                       country:
   *                         type: string
   *                         example: "India"
   *                       pincode:
   *                         type: string
   *                         example: "400001"
   *                       latitude:
   *                         type: number
   *                         example: 19.0760
   *                       longitude:
   *                         type: number
   *                         example: 72.8777
   *                       name:
   *                         type: string
   *                         example: "John Doe"
   *                       mobileNumber:
   *                         type: string
   *                         example: "+1234567890"
   *                       phone:
   *                         type: string
   *                         example: "+1234567890"
   *                       email:
   *                         type: string
   *                         example: "john.doe@example.com"
   *                       status:
   *                         type: string
   *                         enum: [ACTIVE, INACTIVE]
   *                         example: ACTIVE
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
   *             required:
   *               - updatedBy
   *               - concurrencyStamp
   *             properties:
   *               addressLine1:
   *                 type: string
   *                 example: "123"
   *                 description: Address line 1 (optional)
   *               addressLine2:
   *                 type: string
   *                 example: "Apartment 4B"
   *                 description: Address line 2 (optional)
   *               street:
   *                 type: string
   *                 example: "Main Street"
   *                 description: Street name (optional)
   *               landmark:
   *                 type: string
   *                 example: "Near City Park"
   *                 description: Landmark (optional)
   *               city:
   *                 type: string
   *                 example: "Mumbai"
   *                 description: City name (optional)
   *               state:
   *                 type: string
   *                 example: "Maharashtra"
   *                 description: State name (optional)
   *               country:
   *                 type: string
   *                 example: "India"
   *                 description: Country name (optional)
   *               pincode:
   *                 type: string
   *                 example: "400001"
   *                 description: Postal/PIN code (optional)
   *               latitude:
   *                 type: number
   *                 format: decimal
   *                 minimum: -90
   *                 maximum: 90
   *                 example: 19.0760
   *                 description: Latitude coordinate (optional)
   *               longitude:
   *                 type: number
   *                 format: decimal
   *                 minimum: -180
   *                 maximum: 180
   *                 example: 72.8777
   *                 description: Longitude coordinate (optional)
   *               name:
   *                 type: string
   *                 example: "John Doe"
   *                 description: Recipient name (optional)
   *               mobileNumber:
   *                 type: string
   *                 example: "+1234567890"
   *                 description: Mobile number (optional)
   *               phone:
   *                 type: string
   *                 example: "+1234567890"
   *                 description: Phone number (optional)
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "john.doe@example.com"
   *                 description: Email address (optional)
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *                 description: Address status (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the address (required)
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response (required)
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
