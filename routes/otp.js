const {
  sendOTPToMail,
  verifyOTP,
  sendOTPToMailForNewUser,
  verifyOtpForNewUser,
  sendOTPToSMS,
  verifyOTPBySMS,
  sendOTPToSMSForNewUser,
  verifyOTPForNewUserBySMS,
} = require('../controllers/otpController')

module.exports = (router) => {
  /**
   * @swagger
   * /verify-otp:
   *   post:
   *     summary: Verify OTP for existing user
   *     tags: [OTP]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - otp
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               otp:
   *                 type: string
   *                 example: "123456"
   *     responses:
   *       200:
   *         description: OTP verified successfully
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
   *                   example: "OTP verified successfully"
   *       400:
   *         description: Invalid or expired OTP
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
   *                   example: "Invalid or expired OTP"
   */
  router.post('/verify-otp', verifyOTP)

  /**
   * @swagger
   * /send-otp-to-mail:
   *   post:
   *     summary: Send OTP to email for existing user
   *     tags: [OTP]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
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
   *                   example: "OTP sent to your email"
   *       400:
   *         description: User not found or error sending OTP
   */
  router.post('/send-otp-to-mail', sendOTPToMail)

  /**
   * @swagger
   * /send-otp-to-mail-for-new-user:
   *   post:
   *     summary: Send OTP to email for new user registration
   *     tags: [OTP]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "newuser@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
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
   *                   example: "OTP sent to your email"
   *       400:
   *         description: Error sending OTP
   */
  router.post('/send-otp-to-mail-for-new-user', sendOTPToMailForNewUser)

  /**
   * @swagger
   * /verify-otp-for-new-user:
   *   post:
   *     summary: Verify OTP for new user registration
   *     tags: [OTP]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - otp
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "newuser@example.com"
   *               mobile_number:
   *                 type: string
   *                 example: "+1234567890"
   *               otp:
   *                 type: string
   *                 example: "123456"
   *     responses:
   *       200:
   *         description: OTP verified successfully
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
   *                   example: "OTP verified successfully"
   *       400:
   *         description: Invalid or expired OTP
   */
  router.post('/verify-otp-for-new-user', verifyOtpForNewUser)

  /**
   * @swagger
   * /send-otp-to-sms:
   *   post:
   *     summary: Send OTP to SMS for existing user
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
   *         description: User not found or error sending SMS
   */
  router.post('/send-otp-to-sms', sendOTPToSMS)

  /**
   * @swagger
   * /verify-otp-by-sms:
   *   post:
   *     summary: Verify OTP sent via SMS for existing user
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
   *         description: OTP verified successfully
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
   *                   example: "OTP verified successfully"
   *       400:
   *         description: Invalid or expired OTP
   */
  router.post('/verify-otp-by-sms', verifyOTPBySMS)

  /**
   * @swagger
   * /send-otp-to-sms-for-new-user:
   *   post:
   *     summary: Send OTP to SMS for new user registration
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
  router.post('/send-otp-to-sms-for-new-user', sendOTPToSMSForNewUser)

  /**
   * @swagger
   * /verify-otp-for-new-user-by-sms:
   *   post:
   *     summary: Verify OTP sent via SMS for new user registration
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
   *         description: OTP verified successfully
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
   *                   example: "OTP verified successfully"
   *       400:
   *         description: Invalid or expired OTP
   */
  router.post('/verify-otp-for-new-user-by-sms', verifyOTPForNewUserBySMS)
}
