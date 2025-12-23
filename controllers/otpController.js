const { Otp: OtpService } = require('../services')
const { otp: OTPModel, user: UserModel, sequelize } = require('../database')
const { verifyOtp: verifyOtpSchema } = require('../schemas')

const Validator = require('../utils/validator')

const sendOTPToMail = async (req, res) => {
  try {
    const { userEmail } = req.body

    const user = await UserModel.findOne({
      where: { email: userEmail },
    })
    if (!user) {
      return res
        .status(400)
        .json({ message: 'email doesnot exist, please register' })
    }
    const result = await OtpService.sendOTPToMail(userEmail)
    if (result) {
      return res.status(200).json({ message: 'email sent successfully' })
    }
    return res.status(400).json({ message: 'email sending failed' })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body
    const data = { email, otp }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: verifyOtpSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc } = await OtpService.verifyOTP(data)

    if (doc) {
      res.setHeader('message', 'otp has been successfully verfifed.')

      return res.status(200).json({ message: 'otp verified successfully' })
    }

    return res.badRequest('field-validation', err)
  } catch (error) {
    return res.serverError(error)
  }
}

const sendOTPToMailForNewUser = async (req, res) => {
  try {
    const { userEmail } = req.body

    const result = await OtpService.sendOTPToMailForNewUser(userEmail)
    if (result) {
      return res.status(200).json({ message: 'email sent successfully' })
    }
    return res.status(400).json({ message: 'email sending failed' })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const verifyOtpForNewUser = async (req, res) => {
  try {
    const { email, otp } = req.body
    const data = { email, otp }

    const { errors, doc } = await OtpService.verifyOtpForNewUser(data)

    if (doc) {
      return res.status(200).json(doc)
    }
    return res.status(400).json(errors)
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  sendOTPToMail,
  verifyOTP,
  sendOTPToMailForNewUser,
  verifyOtpForNewUser
}
