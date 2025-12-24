const { Otp: OtpService } = require('../services')
const { otp: OTPModel, user: UserModel, sequelize } = require('../database')
const {
  verifyOtp: verifyOtpSchema,
  sendOTPToMail: sendOTPToMailSchema,
  sendOTPToSMS: sendOTPToSMSSchema,
  verifyOTPBySMS: verifyOTPBySMSSchema,
} = require('../schemas')

const Validator = require('../utils/validator')

const sendOTPToMail = async (req, res) => {
  try {
    const { userEmail } = req.body

    const data = { userEmail }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: sendOTPToMailSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

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

    const data = { userEmail }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: sendOTPToMailSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

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

    const { errors } = Validator.isSchemaValid({
      data,
      schema: verifyOtpSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc } = await OtpService.verifyOtpForNewUser(data)

    if (doc) {
      return res.status(200).json(doc)
    }
    return res.badRequest('field-validation', err)
  } catch (error) {
    return res.serverError(error)
  }
}

const sendOTPToSMS = async (req, res) => {
  try {
    const { mobileNumber } = req.body

    const data = { mobileNumber }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: sendOTPToSMSSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const user = await UserModel.findOne({
      where: { mobile_number: mobileNumber },
    })
    if (!user) {
      return res
        .status(400)
        .json({ message: 'mobile number does not exist, please register' })
    }
    const result = await OtpService.sendOTPToSMS(mobileNumber)
    if (result && result.success) {
      return res.status(200).json({ message: 'SMS sent successfully' })
    }
    return res.status(400).json({ message: 'SMS sending failed', error: result?.error })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const verifyOTPBySMS = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body
    const data = { mobileNumber, otp }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: verifyOTPBySMSSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc } = await OtpService.verifyOTPBySMS(data)

    if (doc) {
      res.setHeader('message', 'otp has been successfully verified.')

      return res.status(200).json({ message: 'otp verified successfully' })
    }

    return res.badRequest('field-validation', err)
  } catch (error) {
    return res.serverError(error)
  }
}

const sendOTPToSMSForNewUser = async (req, res) => {
  try {
    const { mobileNumber } = req.body

    const data = { mobileNumber }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: sendOTPToSMSSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const result = await OtpService.sendOTPToSMSForNewUser(mobileNumber)
    if (result && result.success) {
      return res.status(200).json({ message: 'SMS sent successfully' })
    }
    return res.status(400).json({ message: 'SMS sending failed', error: result?.error })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const verifyOTPForNewUserBySMS = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body
    const data = { mobileNumber, otp }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: verifyOTPBySMSSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc } = await OtpService.verifyOTPForNewUserBySMS(data)

    if (doc) {
      return res.status(200).json(doc)
    }
    return res.badRequest('field-validation', err)
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  sendOTPToMail,
  verifyOTP,
  sendOTPToMailForNewUser,
  verifyOtpForNewUser,
  sendOTPToSMS,
  verifyOTPBySMS,
  sendOTPToSMSForNewUser,
  verifyOTPForNewUserBySMS,
}
