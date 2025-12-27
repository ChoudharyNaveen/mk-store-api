const multer = require('multer');
const {
  createSuperAdmin,
  authLogin,
  createVendorAdmin,
  updateUser,
  convertUserToRider,
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
};
