const multer = require('multer');
const {
  createSuperAdmin,
  authLogin,
  createVendorAdmin,
  updateUser,
  convertUserToRider,
  getUserProfile,
  refreshToken,
  getUsers,
  logout,
} = require('../controllers/userController');

const upload = multer();
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  userSignUp: userSignUpSchema,
  authLogin: authLoginSchema,
  createVendorAdmin: createVendorAdminSchema,
  updateUser: updateUserSchema,
  convertUserToRider: convertUserToRiderSchema,
  refreshToken: refreshTokenSchema,
  getUser: getUsersSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /create-super-admin:
   *   post:
   *     summary: Create super admin user
   *     tags: [Authentication]
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
   *               - password
   *               - confirm_password
   *               - mobile_number
   *               - email
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Super Admin"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "superadmin@example.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *               confirm_password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Profile image file
   *     responses:
   *       200:
   *         description: Super admin created successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/create-super-admin',
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(userSignUpSchema),
    createSuperAdmin,
  );

  /**
   * @swagger
   * /auth-login:
   *   post:
   *     summary: Authentication login with email and password (similar to OTP verification)
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  router.post('/auth-login', validate(authLoginSchema), authLogin);

  /**
   * @swagger
   * /user-profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
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
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     mobileNumber:
   *                       type: string
   *                       example: "+1234567890"
   *                     email:
   *                       type: string
   *                       format: email
   *                       example: "user@example.com"
   *                     dateOfBirth:
   *                       type: string
   *                       format: date
   *                       example: "1990-01-01"
   *                     gender:
   *                       type: string
   *                       enum: [MALE, FEMALE]
   *                       example: "MALE"
   *                     status:
   *                       type: string
   *                       enum: [ACTIVE, INACTIVE]
   *                       example: "ACTIVE"
   *                     profileStatus:
   *                       type: string
   *                       enum: [INCOMPLETE, COMPLETE]
   *                       example: "COMPLETE"
   *                     image:
   *                       type: string
   *                       example: "https://example.com/image.jpg"
   *                     roleName:
   *                       type: string
   *                       example: "USER"
   *                     vendorId:
   *                       type: integer
   *                       nullable: true
   *                       example: 1
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       404:
   *         description: User not found
   */
  router.get('/user-profile', isAuthenticated, getUserProfile);

  /**
   * @swagger
   * /create-vendor-admin:
   *   post:
   *     summary: Create a vendor admin user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - vendorId
   *               - name
   *               - mobile_number
   *               - email
   *               - password
   *             properties:
   *               vendorId:
   *                 type: integer
   *                 description: Vendor ID
   *                 example: 1
   *               name:
   *                 type: string
   *                 example: "Admin Name"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "admin@vendor.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 minLength: 6
   *                 example: "SecurePassword123"
   *               date_of_birth:
   *                 type: string
   *                 format: date
   *                 example: "1990-01-01"
   *               gender:
   *                 type: string
   *                 enum: [MALE, FEMALE]
   *                 example: "MALE"
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 example: ACTIVE
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Profile image file
   *     responses:
   *       200:
   *         description: Vendor admin created successfully
   *       400:
   *         description: Validation error or vendor already has an admin
   */
  router.post(
    '/create-vendor-admin',
    isAuthenticated,
    isVendorAdmin,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(createVendorAdminSchema),
    createVendorAdmin,
  );

  /**
   * @swagger
   * /update-user/{id}:
   *   patch:
   *     summary: Update user information
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: User ID
   *         example: 1
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "John Doe Updated"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "john.updated@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "NewPassword123"
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Profile image file
   *     responses:
   *       200:
   *         description: User updated successfully
   *       400:
   *         description: Validation error
   */
  router.patch(
    '/update-user/:id',
    isAuthenticated,
    upload.fields([ { name: 'file', maxCount: 1 } ]),
    validate(updateUserSchema),
    updateUser,
  );

  /**
   * @swagger
   * /convert-user-to-rider:
   *   post:
   *     summary: Convert a user to rider role (Vendor Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *             properties:
   *               userId:
   *                 type: integer
   *                 description: User ID to convert to rider
   *                 example: 1
   *     responses:
   *       200:
   *         description: User successfully converted to rider
   *       400:
   *         description: Validation error or user is already a rider
   *       403:
   *         description: Access denied. Vendor admin role required.
   *       404:
   *         description: User not found
   */
  router.post(
    '/convert-user-to-rider',
    isAuthenticated,
    isVendorAdmin,
    validate(convertUserToRiderSchema),
    convertUserToRider,
  );

  /**
   * @swagger
   * /refresh-token:
   *   post:
   *     summary: Refresh access token using old token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *             properties:
   *               token:
   *                 type: string
   *                 description: The old/expired access token
   *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 doc:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Token refreshed successfully"
   *                     token:
   *                       type: string
   *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *                     user:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: integer
   *                         name:
   *                           type: string
   *                         mobileNumber:
   *                           type: string
   *                         email:
   *                           type: string
   *                         status:
   *                           type: string
   *                         profileStatus:
   *                           type: string
   *                         roleName:
   *                           type: string
   *                         vendorId:
   *                           type: integer
   *       401:
   *         description: Invalid or expired token
   *       400:
   *         description: Validation error
   */
  router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

  /**
   * @swagger
   * /get-users:
   *   post:
   *     summary: Get users filtered by vendor and role
   *     description: Vendor ID is automatically extracted from the JWT token. Only users belonging to the vendor in the token will be returned.
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: tab
   *         required: false
   *         schema:
   *           type: string
   *         description: Role name to filter users (e.g., ADMIN, RIDER, VENDOR_ADMIN). If not provided, returns all users for the vendor.
   *         example: ADMIN
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               pageSize:
   *                 type: integer
   *                 enum: [1, 5, 10, 20, 30, 40, 50, 100, 500]
   *                 default: 10
   *                 description: Number of items per page
   *                 example: 10
   *               pageNumber:
   *                 type: integer
   *                 minimum: 1
   *                 default: 1
   *                 description: Page number (1-indexed)
   *                 example: 1
   *               filters:
   *                 type: array
   *                 description: Array of filter objects to filter user data
   *                 items:
   *                   type: object
   *                   required:
   *                     - key
   *                   properties:
   *                     key:
   *                       type: string
   *                       description: Field name to filter on (e.g., name, email, mobileNumber, status)
   *                       example: "name"
   *                     in:
   *                       type: array
   *                       items:
   *                         type: string
   *                       description: Filter where value is in array
   *                       example: ["John", "Jane"]
   *                     eq:
   *                       type: string
   *                       description: Filter where value equals
   *                       example: "John"
   *                     neq:
   *                       type: string
   *                       description: Filter where value not equals
   *                       example: "John"
   *                     gt:
   *                       type: string
   *                       description: Filter where value greater than
   *                       example: "2020-01-01"
   *                     gte:
   *                       type: string
   *                       description: Filter where value greater than or equal
   *                       example: "2020-01-01"
   *                     lt:
   *                       type: string
   *                       description: Filter where value less than
   *                       example: "2020-12-31"
   *                     lte:
   *                       type: string
   *                       description: Filter where value less than or equal
   *                       example: "2020-12-31"
   *                     like:
   *                       type: string
   *                       description: Filter where value contains (case-sensitive)
   *                       example: "John"
   *                     iLike:
   *                       type: string
   *                       description: Filter where value contains (case-insensitive)
   *                       example: "john"
   *               sorting:
   *                 type: array
   *                 description: Array of sorting objects
   *                 items:
   *                   type: object
   *                   required:
   *                     - key
   *                     - direction
   *                   properties:
   *                     key:
   *                       type: string
   *                       description: Field name to sort by (e.g., createdAt, name, email)
   *                       example: "createdAt"
   *                     direction:
   *                       type: string
   *                       enum: [ASC, DESC]
   *                       description: Sort direction
   *                       example: "DESC"
   *     responses:
   *       200:
   *         description: Users retrieved successfully
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
   *                       name:
   *                         type: string
   *                         example: "John Doe"
   *                       mobileNumber:
   *                         type: string
   *                         example: "+1234567890"
   *                       email:
   *                         type: string
   *                         format: email
   *                         example: "john@example.com"
   *                       status:
   *                         type: string
   *                         enum: [ACTIVE, INACTIVE]
   *                         example: "ACTIVE"
   *                       profileStatus:
   *                         type: string
   *                         enum: [INCOMPLETE, COMPLETE]
   *                         example: "COMPLETE"
   *                       image:
   *                         type: string
   *                         example: "https://example.com/image.jpg"
   *                       vendorId:
   *                         type: integer
   *                         description: Vendor ID from user_roles_mappings
   *                         example: 1
   *                       mappingId:
   *                         type: integer
   *                         description: ID from user_roles_mappings table
   *                         example: 1
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-01T00:00:00.000Z"
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-01T00:00:00.000Z"
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     pageSize:
   *                       type: integer
   *                       example: 10
   *                     pageNumber:
   *                       type: integer
   *                       example: 1
   *                     totalCount:
   *                       type: integer
   *                       nullable: true
   *                       description: Total count of filtered records. null when pageNumber > 1
   *                       example: 25
   *                     paginationEnabled:
   *                       type: boolean
   *                       description: Whether pagination is enabled (true if totalCount > pageSize or pageNumber > 1)
   *                       example: true
   *       400:
   *         description: Validation error or role not found
   *       401:
   *         description: Unauthorized - Invalid or missing token
   */
  router.post('/get-users', isAuthenticated, validate(getUsersSchema), getUsers);

  /**
   * @swagger
   * /logout:
   *   post:
   *     summary: Logout user and close all socket connections
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logged out successfully
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
   *                   example: "Logged out successfully"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     disconnectedSockets:
   *                       type: integer
   *                       description: Number of socket connections that were disconnected
   *                       example: 2
   *       401:
   *         description: Unauthorized - Invalid or missing token
   */
  router.post('/auth-logout', isAuthenticated, logout);
};
