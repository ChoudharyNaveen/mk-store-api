const {
  sendOtpSMSForUser,
  verifyOtpSMSForUser,
} = require('../controllers/otpController');
const validate = require('../middleware/validation');
const {
  sendOTPToSMS: sendOTPToSMSSchema,
  verifyOTPBySMS: verifyOTPBySMSSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /send-otp-sms-for-user:
   *   post:
   *     summary: Send OTP to SMS for user (creates user if new mobile number)
   *     tags: [OTP, CLIENT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - mobileNumber
   *               - vendorId
   *             properties:
   *               mobileNumber:
   *                 type: string
   *                 pattern: '^\+[1-9]\d{1,14}$'
   *                 example: "+1234567890"
   *                 description: Mobile number in E.164 format
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID
   *     responses:
   *       200:
   *         description: OTP sent successfully
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
   *                   example: "SMS sent successfully"
   *       400:
   *         description: Error sending SMS
   */
  router.post('/send-otp-sms-for-user', validate(sendOTPToSMSSchema), sendOtpSMSForUser);

  /**
   * @swagger
   * /verify-otp-sms-for-user:
   *   post:
   *     summary: Verify OTP sent via SMS and login user
   *     tags: [OTP, CLIENT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - mobileNumber
   *               - otp
   *               - vendorId
   *             properties:
   *               mobileNumber:
   *                 type: string
   *                 pattern: '^\+[1-9]\d{1,14}$'
   *                 example: "+1234567890"
   *                 description: Mobile number in E.164 format
   *               otp:
   *                 type: string
   *                 example: "123456"
   *                 description: OTP code received via SMS
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID
   *     responses:
   *       200:
   *         description: OTP verified successfully, user logged in
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
   *                       example: "OTP verified successfully. User logged in."
   *                     user:
   *                       type: object
   *                       description: User data (without password)
   *                       properties:
   *                         id:
   *                           type: integer
   *                           example: 1
   *                         name:
   *                           type: string
   *                           example: "John Doe"
   *                         mobileNumber:
   *                           type: string
   *                           example: "+1234567890"
   *                         email:
   *                           type: string
   *                           example: "john@example.com"
   *                         status:
   *                           type: string
   *                           example: "ACTIVE"
   *                         profileStatus:
   *                           type: string
   *                           example: "COMPLETE"
   *                         roleName:
   *                           type: string
   *                           example: "user"
   *                         vendorId:
   *                           type: integer
   *                           example: 1
   *                     token:
   *                       type: string
   *                       description: JWT access token
   *       400:
   *         description: Invalid or expired OTP
   */
  router.post('/verify-otp-sms-for-user', validate(verifyOTPBySMSSchema), verifyOtpSMSForUser);
};
