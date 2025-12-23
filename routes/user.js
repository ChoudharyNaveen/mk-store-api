const {
  userSignUp,
  userLogin,
  getTotalUsers,
  updateUser,
  adminLogin,
  customerSignUp,
  riderLogin
} = require('../controllers/userController')
const multer = require('multer')
const upload = multer()
const { isAuthenticated } = require('../middleware/auth')

module.exports = (router) => {
  /**
   * @swagger
   * /rider-sign-up:
   *   post:
   *     summary: Rider sign up
   *     tags: [Authentication]
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
   *                 example: John Doe
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "john.doe@example.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *               confirm_password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *               date_of_birth:
   *                 type: string
   *                 format: date
   *                 example: "1990-01-01"
   *               gender:
   *                 type: string
   *                 example: "Male"
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
   *         description: User successfully registered
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
   *                   example: "User registered successfully"
   *                 doc:
   *                   type: object
   *                   properties:
   *                     publicId:
   *                       type: string
   *                       example: "uuid-here"
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     email:
   *                       type: string
   *                       example: "john.doe@example.com"
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post(
    '/rider-sign-up',
    upload.fields([{ name: 'file', maxCount: 1 }]),
    userSignUp
  )

  /**
   * @swagger
   * /rider-login:
   *   post:
   *     summary: Rider login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "rider@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *     responses:
   *       200:
   *         description: Login successful
   *         headers:
   *           token:
   *             schema:
   *               type: string
   *             description: JWT authentication token
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
   *                     publicId:
   *                       type: string
   *                       example: "uuid-here"
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     email:
   *                       type: string
   *                       example: "rider@example.com"
   *                     access_token:
   *                       type: string
   *                       example: "jwt-token-here"
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Invalid Credentials"
   */
  router.post('/rider-login', riderLogin)

  /**
   * @swagger
   * /user-login:
   *   post:
   *     summary: User login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *     responses:
   *       200:
   *         description: Login successful
   *         headers:
   *           token:
   *             schema:
   *               type: string
   *             description: JWT authentication token
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
   *                     publicId:
   *                       type: string
   *                       example: "uuid-here"
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     email:
   *                       type: string
   *                       example: "user@example.com"
   *                     access_token:
   *                       type: string
   *                       example: "jwt-token-here"
   *       401:
   *         description: Invalid credentials
   */
  router.post('/user-login', userLogin)

  /**
   * @swagger
   * /get-total-users:
   *   get:
   *     summary: Get total number of users
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Total users count
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
   *                     totalUsers:
   *                       type: integer
   *                       example: 150
   */
  router.get('/get-total-users', getTotalUsers)

  /**
   * @swagger
   * /update-user/{publicId}:
   *   patch:
   *     summary: Update user information
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: publicId
   *         required: true
   *         schema:
   *           type: string
   *         description: User public ID
   *         example: "uuid-here"
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
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Profile image file
   *     responses:
   *       200:
   *         description: User updated successfully
   *         headers:
   *           x-concurrencystamp:
   *             schema:
   *               type: string
   *             description: Concurrency stamp for optimistic locking
   *           message:
   *             schema:
   *               type: string
   *             description: Success message
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
   *                   example: "User updated successfully"
   *       400:
   *         description: Validation error
   */
  router.patch(
    '/update-user/:publicId',
    isAuthenticated,
    upload.fields([{ name: 'file', maxCount: 1 }]),
    updateUser
  )

  /**
   * @swagger
   * /admin-login:
   *   post:
   *     summary: Admin login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "admin@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "AdminPassword123"
   *     responses:
   *       200:
   *         description: Admin login successful
   *         headers:
   *           token:
   *             schema:
   *               type: string
   *             description: JWT authentication token
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
   *                     publicId:
   *                       type: string
   *                     role:
   *                       type: string
   *                       example: "ADMIN"
   *                     access_token:
   *                       type: string
   *       401:
   *         description: Invalid credentials
   */
  router.post('/admin-login', adminLogin)

  /**
   * @swagger
   * /customer-sign-up:
   *   post:
   *     summary: Customer sign up
   *     tags: [Authentication]
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
   *                 example: "Jane Customer"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "jane.customer@example.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *               confirm_password:
   *                 type: string
   *                 format: password
   *                 example: "SecurePassword123"
   *               date_of_birth:
   *                 type: string
   *                 format: date
   *                 example: "1995-05-15"
   *               gender:
   *                 type: string
   *                 example: "Female"
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Profile image file
   *     responses:
   *       200:
   *         description: Customer registered successfully
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
   *                   example: "Customer registered successfully"
   *                 doc:
   *                   type: object
   *       400:
   *         description: Validation error
   */
  router.post(
    '/customer-sign-up',
    upload.fields([{ name: 'file', maxCount: 1 }]),
    customerSignUp
  )
}
