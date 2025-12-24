const { Otp: OtpService } = require('../services')

const sendOtpSMSForUser = async (req, res) => {
  try {
    const { mobileNumber } = req.validatedData

    const result = await OtpService.sendOtpSMSForUser(mobileNumber)
    if (result && result.success) {
      return res.status(200).json({ message: 'SMS sent successfully' })
    }
    return res.status(400).json({ message: 'SMS sending failed', error: result?.error })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const verifyOtpSMSForUser = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.validatedData
    const data = { mobileNumber, otp }

    const { errors: err, doc } = await OtpService.verifyOtpSMSForUser(data)

    if (doc) {
      // Set token in response header
      if (doc.token) {
        res.setHeader('token', doc.token)
      }
      res.setHeader('message', 'OTP verified successfully. User logged in.')
      return res.status(200).json(doc)
    }

    return res.badRequest('field-validation', err)
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  sendOtpSMSForUser,
  verifyOtpSMSForUser,
}
