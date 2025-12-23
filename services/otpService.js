const moment = require('moment')
const { otp: OTPModel, user: UserModel, sequelize } = require('../database')
const Helper = require('../utils/helper')
const crypto = require('crypto')
const config = require('../config')
const nodemailer = require('nodemailer')

const verifyOTP = async (payload) => {
  const { email, otp } = payload

  const transaction = await sequelize.transaction()

  try {
    const user = await UserModel.findOne({
      where: { email: email },
    })
    const userId = user?.dataValues?.public_id

    const otpResult = await OTPModel.findOne({
      where: { user_id: userId },
      lock: transaction.LOCK.UPDATE,
    })

    if (!otpResult || otpResult?.dataValues?.status === 'INACTIVE') {
      await transaction.rollback()
      return {
        errors: [{ message: 'OTP not valid. Please try again', name: 'otp' }],
      }
    }

    const { otp: otpResponse } = otpResult

    if (otpResponse !== otp) {
      await transaction.rollback()
      return { errors: [{ message: 'Invalid OTP.', name: 'otp' }] }
    }

    await OTPModel.update(
      { status: 'INACTIVE' },
      { where: { user_id: userId }, transaction }
    )
    await transaction.commit()

    return { doc: { message: 'OTP has been successfully verfifed.' } }
  } catch (error) {
    console.log(error)
    await transaction.rollback()

    return { errors: [{ message: 'transaction failed', name: 'transaction' }] }
  }
}

const sendOTPToMail = async (userEmail) => {
  let transaction = null
  const fromEmail = config.NODEMAILER_SMS.EMAIL
  const fromPassword = config.NODEMAILER_SMS.PASSWORD

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: fromEmail,
      pass: fromPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  const otp = Helper.generateOTP()

  const mailOptions = {
    from: fromEmail,
    to: userEmail,
    subject: 'OTP',
    text: 'Your One-Time Password (OTP) Code',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; border-radius: 8px;">
        <h2 style="text-align: center; color: #333;">Your One-Time Password (OTP)</h2>
        <p>Dear User,</p>
        <p>Thank you for choosing our service. To complete your action, please use the following OTP:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; color: #333; font-weight: bold; background-color: #f8f8f8; padding: 10px 20px; border-radius: 4px;">${otp}</span>
        </div>
        <p style="color: #555;">Please enter this code in the OTP verification field to proceed. This OTP is valid for the next 10 minutes.</p>
        <p>If you did not request this OTP, please ignore this email or contact our support team immediately.</p>
        <p style="color: #555;">Best regards,<br>MK Online Store</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message. Please do not reply to this email.</p>
      </div>`,
  }
  try {
    const info = await transporter.sendMail(mailOptions)
    transaction = await sequelize.transaction()
    const user = await UserModel.findOne({
      where: { email: userEmail },
    })
    const userId = user?.dataValues?.public_id

    const otpEntry = await OTPModel.findOne({
      where: { user_id: userId },
    })
    if (otpEntry) {
      await OTPModel.update(
        { otp: otp, status: 'ACTIVE' },
        {
          where: { user_id: userId },
          transaction,
        }
      )
    } else {
      const otpData = {
        user_id: userId,
        otp: otp,
        mobile_number: user?.dataValues?.mobile_number,
        status: 'ACTIVE',
      }
      await OTPModel.create(otpData, { transaction })
    }
    await transaction.commit()
    return info
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    console.error('Error occurred:', error.message)
    return { message: 'failed' }
  }
}

const sendOTPToMailForNewUser = async (userEmail) => {
  let transaction = null
  const fromEmail = config.NODEMAILER_SMS.EMAIL
  const fromPassword = config.NODEMAILER_SMS.PASSWORD

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: fromEmail,
      pass: fromPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  const otp = Helper.generateOTP()

  const mailOptions = {
    from: fromEmail,
    to: userEmail,
    subject: 'OTP',
    text: 'Your One-Time Password (OTP) Code',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; border-radius: 8px;">
        <h2 style="text-align: center; color: #333;">Your One-Time Password (OTP)</h2>
        <p>Dear User,</p>
        <p>Thank you for choosing our service. To complete your action, please use the following OTP:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; color: #333; font-weight: bold; background-color: #f8f8f8; padding: 10px 20px; border-radius: 4px;">${otp}</span>
        </div>
        <p style="color: #555;">Please enter this code in the OTP verification field to proceed. This OTP is valid for the next 10 minutes.</p>
        <p>If you did not request this OTP, please ignore this email or contact our support team immediately.</p>
        <p style="color: #555;">Best regards,<br>Learning Management System</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message. Please do not reply to this email.</p>
      </div>`,
  }
  try {
    const info = await transporter.sendMail(mailOptions)
    transaction = await sequelize.transaction()

    const otpData = {
      text: userEmail,
      otp: otp,
      type: 'initial-registration',
      status: 'ACTIVE',
    }

    await OTPModel.create(otpData, { transaction })

    await transaction.commit()
    return info
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    console.error('Error occurred:', error.message)
    return { message: 'failed' }
  }
}

const verifyOtpForNewUser = async (payload) => {
  const { email, otp } = payload

  try {
    const otpResult = await OTPModel.findOne({
      where: { text: email},
    })
    if (otpResult === null) {
      return {
        errors: [{ message: 'OTP not valid. Please try again' }],
      }
    }
    const { otp: otpResponse } = otpResult

    if (otpResponse !== otp) {
      return { errors: [{ message: 'Invalid OTP.', name: 'otp' }] }
    }

    await OTPModel.destroy(
      { where: { text: email } }
    )

    return { doc: { message: 'OTP has been successfully verfifed.' } }
  } catch (error) {
    await transaction.rollback()

    return { errors: [{ message: 'transaction failed', name: 'transaction' }] }
  }
}

module.exports = {
  verifyOTP,
  sendOTPToMail,
  sendOTPToMailForNewUser,
  verifyOtpForNewUser,
}
