const verifyOtp = require('./verify-otp')
const sendOTPToMail = require('./sendOTPToMail')
const sendOTPToSMS = require('./sendOTPToSMS')
const verifyOTPBySMS = require('./verifyOTPBySMS')

module.exports = {
  verifyOtp,
  sendOTPToMail,
  sendOTPToSMS,
  verifyOTPBySMS,
}