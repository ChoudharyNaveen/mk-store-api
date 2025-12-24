const {
  sendOtpSMSForUser,
  verifyOtpSMSForUser,
} = require('../controllers/otpController')
const validate = require('../middleware/validation')
const {
  sendOTPToSMS: sendOTPToSMSSchema,
  verifyOTPBySMS: verifyOTPBySMSSchema,
} = require('../schemas')

module.exports = (router) => {
  /**
   * @swagger
   * /send-otp-sms-for-user:
   *   post:
   *     summary: Send OTP to SMS for user (creates user if new mobile number)
   *     tags: [OTP]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - mobileNumber
   *             properties:
   *               mobileNumber:
   *                 type: string
   *                 pattern: '^\+[1-9]\d{1,14}$'
   *                 example: "+1234567890"
   *                 description: Mobile number in E.164 format
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
  router.post('/send-otp-sms-for-user', validate(sendOTPToSMSSchema), sendOtpSMSForUser)

  /**
   * @swagger
   * /verify-otp-sms-for-user:
   *   post:
   *     summary: Verify OTP sent via SMS and login user
   *     tags: [OTP]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - mobileNumber
   *               - otp
   *             properties:
   *               mobileNumber:
   *                 type: string
   *                 pattern: '^\+[1-9]\d{1,14}$'
   *                 example: "+1234567890"
   *                 description: Mobile number in E.164 format
   *               otp:
   *                 type: string
   *                 example: "123456"
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
   *       400:
   *         description: Invalid or expired OTP
   */
  router.post('/verify-otp-sms-for-user', validate(verifyOTPBySMSSchema), verifyOtpSMSForUser)
}
