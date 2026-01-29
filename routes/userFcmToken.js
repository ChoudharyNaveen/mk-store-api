const {
  registerFCMToken,
  removeFCMToken,
  getFCMToken,
} = require('../controllers/userFcmTokenController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  registerFcmToken: registerFcmTokenSchema,
  removeFcmToken: removeFcmTokenSchema,
} = require('../schemas/userFcmToken');

module.exports = (router) => {
  /**
   * @swagger
   * /register-user-fcm-token:
   *   post:
   *     summary: Register or update FCM token for user
   *     tags: [User FCM, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fcmToken
   *             properties:
   *               fcmToken:
   *                 type: string
   *                 example: "fcm_token_string_here"
   *               deviceType:
   *                 type: string
   *                 enum: [android, ios, web]
   *                 nullable: true
   *                 example: "android"
   *               deviceId:
   *                 type: string
   *                 nullable: true
   *                 example: "device_unique_id"
   *     responses:
   *       200:
   *         description: FCM token registered successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.post(
    '/register-user-fcm-token',
    isAuthenticated,
    validate(registerFcmTokenSchema),
    registerFCMToken,
  );

  /**
   * @swagger
   * /remove-user-fcm-token:
   *   delete:
   *     summary: Remove FCM token for user
   *     tags: [User FCM, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               tokenId:
   *                 type: integer
   *                 example: 1
   *               fcmToken:
   *                 type: string
   *                 example: "fcm_token_string_here"
   *     responses:
   *       200:
   *         description: FCM token removed successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Token not found
   */
  router.delete(
    '/remove-user-fcm-token',
    isAuthenticated,
    validate(removeFcmTokenSchema),
    removeFCMToken,
  );

  /**
   * @swagger
   * /user-fcm-token:
   *   get:
   *     summary: Get current user's FCM token information
   *     tags: [User FCM, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: FCM token information retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/user-fcm-token',
    isAuthenticated,
    getFCMToken,
  );
};
