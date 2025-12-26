const { Otp: OtpService } = require('../services')
const { handleServerError } = require('../utils/helper')

const sendOtpSMSForUser = async (req, res) => {
  try {
    const { mobileNumber, vendorId } = req.validatedData

    const result = await OtpService.sendOtpSMSForUser(mobileNumber, vendorId)
    if (result && result.success) {
      return res.status(200).json({ message: 'SMS sent successfully' })
    }
    return res.status(400).json({ message: 'SMS sending failed', error: result?.error })
  } catch (error) {
    console.log(error)
    return handleServerError(error, req, res)
  }
}

const verifyOtpSMSForUser = async (req, res) => {
  try {
    const { mobileNumber, otp, vendorId } = req.validatedData
    const data = { mobileNumber, otp, vendorId }

    const { errors: err, doc } = await OtpService.verifyOtpSMSForUser(data)

    if (doc) {
      // Set token in response header
      if (doc.token) {
        res.setHeader('token', doc.token)
      }
      res.setHeader('message', 'OTP verified successfully. User logged in.')
      return res.status(200).json(doc)
    }

    return res.status(400).json({ success: false, errors: err })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

module.exports = {
  sendOtpSMSForUser,
  verifyOtpSMSForUser,
}
