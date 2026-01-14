const {
  registerFCMToken,
  removeFCMToken,
  getFCMToken,
} = require('../controllers/riderFcmTokenController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  registerFcmToken: registerFcmTokenSchema,
  removeFcmToken: removeFcmTokenSchema,
} = require('../schemas/riderFcmToken');

module.exports = (router) => {
  /**
   * @swagger
   * /register-rider-fcm-token:
   *   post:
   *     summary: Register or update FCM token for rider
   *     tags: [Rider FCM]
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
   *               - vendorId
   *             properties:
   *               fcmToken:
   *                 type: string
   *                 example: "fcm_token_string_here"
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *               branchId:
   *                 type: integer
   *                 nullable: true
   *                 example: 1
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
    '/register-rider-fcm-token',
    isAuthenticated,
    validate(registerFcmTokenSchema),
    registerFCMToken,
  );

  /**
   * @swagger
   * /remove-rider-fcm-token:
   *   delete:
   *     summary: Remove FCM token for rider
   *     tags: [Rider FCM]
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
    '/remove-rider-fcm-token',
    isAuthenticated,
    validate(removeFcmTokenSchema),
    removeFCMToken,
  );

  /**
   * @swagger
   * /rider-fcm-token:
   *   get:
   *     summary: Get current rider's FCM token information
   *     tags: [Rider FCM]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: FCM token information retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/rider-fcm-token',
    isAuthenticated,
    getFCMToken,
  );
};
