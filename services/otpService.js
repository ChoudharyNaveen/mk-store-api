const { otp: OTPModel,
  user: UserModel,
  role: RoleModel,
  user_roles_mappings: UserRolesMappingModel,
  vendor: VendorModel,
  sequelize,
} = require('../database')
const Helper = require('../utils/helper')
const config = require('../config')
const { sendSMS } = require('../config/aws')
const { v4: uuidV4 } = require('uuid')
const jwt = require('jsonwebtoken')

const sendOtpSMSForUser = async (mobileNumber, vendorId) => {
  let transaction = null

  // Use mock OTP if USE_MOCK_SMS is enabled, otherwise generate random OTP
  const otp = config.AWS.USE_MOCK_SMS ? config.AWS.MOCK_OTP : Helper.generateOTP()
  const message = `Your One-Time Password (OTP) for MK Online Store is ${otp}. This OTP is valid for the next 10 minutes. Please do not share this code with anyone.`

  try {
    transaction = await sequelize.transaction()

    // Check if user exists for this vendor by checking mobile_number and user_roles_mappings
    let user = await UserModel.findOne({
      where: {
        mobile_number: mobileNumber,
      }
    })

    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
    })

    if (!vendor) {
      return { message: 'failed', error: 'Vendor not found' }
    }

    // If user doesn't exist for this vendor, create a new user
    if (!user) {
      const userRole = await RoleModel.findOne({
        where: { name: 'USER' },
      })

      if (!userRole) {
        await transaction.rollback()
        return { message: 'failed', error: 'User role not found' }
      }

      const concurrency_stamp = uuidV4()

      const newUser = await UserModel.create(
        {
          concurrency_stamp,
          mobile_number: mobileNumber,
          profile_status: 'INCOMPLETE',
          status: 'ACTIVE',
        },
        { transaction }
      )

      // Create user_roles_mappings entry
      const mappingConcurrencyStamp = uuidV4()
      await UserRolesMappingModel.create(
        {
          vendor_id: vendorId,
          user_id: newUser.id,
          role_id: userRole.id,
          status: 'ACTIVE',
          concurrency_stamp: mappingConcurrencyStamp,
        },
        { transaction }
      )

      user = newUser
    }

    // Send SMS
    const smsResult = await sendSMS(mobileNumber, message)

    if (!smsResult.success) {
      await transaction.rollback()
      return { message: 'failed', error: smsResult.error }
    }

    const userId = user.id

    // Create or update OTP entry
    const otpEntry = await OTPModel.findOne({
      where: { user_id: userId },
    })

    if (otpEntry) {
      await OTPModel.update(
        { otp: otp, status: 'ACTIVE', mobile_number: mobileNumber },
        {
          where: { user_id: userId },
          transaction,
        }
      )
    } else {
      const otpData = {
        user_id: userId,
        otp: otp,
        mobile_number: mobileNumber,
        status: 'ACTIVE',
      }
      await OTPModel.create(otpData, { transaction })
    }

    await transaction.commit()
    return { messageId: smsResult.messageId, success: true }
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    console.error('Error occurred:', error.message)
    return { message: 'failed', error: error.message }
  }
}

const verifyOtpSMSForUser = async (payload) => {
  const { mobileNumber, otp, vendorId } = payload

  const transaction = await sequelize.transaction()

  try {
    const user = await UserModel.findOne({
      where: {
        mobile_number: mobileNumber,
      },
      include: [
        {
          model: UserRolesMappingModel,
          as: 'roleMappings',
          where: {
            vendor_id: vendorId,
            status: 'ACTIVE',
          },
          required: true,
          include: [{
            model: RoleModel,
            as: 'role',
          }],
        },
      ],
    })

    if (!user) {
      await transaction.rollback()
      return {
        errors: [{ message: 'User not found. Please send OTP first.', name: 'user' }],
      }
    }

    const userId = user.id

    const otpResult = await OTPModel.findOne({
      where: { user_id: userId },
      lock: transaction.LOCK.UPDATE,
    })

    if (!otpResult || otpResult.dataValues.status === 'INACTIVE') {
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

    // Mark OTP as inactive
    await OTPModel.update(
      { status: 'INACTIVE' },
      { where: { user_id: userId }, transaction }
    )

    await transaction.commit()

    // Extract only required fields and role name from user_roles_mappings
    const userData = Helper.convertSnakeToCamel(user.dataValues)
    const roleMapping = user.dataValues.roleMappings && user.dataValues.roleMappings[0]
    const roleData = roleMapping && roleMapping.role ? Helper.convertSnakeToCamel(roleMapping.role.dataValues) : null
    const mappingData = roleMapping ? Helper.convertSnakeToCamel(roleMapping.dataValues) : null

    // Prepare user response with only required fields
    const userResponse = {
      id: userData.id,
      name: userData.name || null,
      mobileNumber: userData.mobileNumber,
      email: userData.email || null,
      status: userData.status,
      profileStatus: userData.profileStatus,
      roleName: roleData ? roleData.name : null,
      vendorId: mappingData ? mappingData.vendorId : null,
    }

    // Generate JWT token
    // Use password if available, otherwise use concurrency_stamp for token secret
    const password = userData.password || userData.concurrencyStamp
    const tokenSecret = config.jwt.token_secret + password

    const token = jwt.sign(userData, tokenSecret, {
      expiresIn: config.jwt.token_life,
    })

    return {
      doc: {
        message: 'OTP verified successfully. User logged in.',
        user: userResponse,
        token: token,
      },
    }
  } catch (error) {
    console.log(error)
    await transaction.rollback()
    return { errors: [{ message: 'transaction failed', name: 'transaction' }] }
  }
}

module.exports = {
  sendOtpSMSForUser,
  verifyOtpSMSForUser,
}
