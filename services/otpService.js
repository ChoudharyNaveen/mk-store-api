const { v4: uuidV4 } = require('uuid');
const jwt = require('jsonwebtoken');
const {
  otp: OTPModel,
  user: UserModel,
  role: RoleModel,
  user_roles_mappings: UserRolesMappingModel,
  vendor: VendorModel,
  sequelize,
} = require('../database');
const {
  generateOTP,
  convertSnakeToCamel,
} = require('../utils/helper');
const config = require('../config');
const { sendSMS } = require('../config/aws');
const { createUserRegistrationNotification } = require('./notificationService');
const {
  NotFoundError,
  ValidationError,
  handleServiceError,
} = require('../utils/serviceErrors');

const sendOtpSMSForUser = async (mobileNumber, vendorId) => {
  let transaction = null;

  // Use mock OTP if USE_MOCK_SMS is enabled, otherwise generate random OTP
  const otp = config.AWS.USE_MOCK_SMS ? config.AWS.MOCK_OTP : generateOTP();
  const message = `Your One-Time Password (OTP) for MK Online Store is ${otp}. 
  This OTP is valid for the next 10 minutes. Please do not share this code with anyone.`;

  try {
    transaction = await sequelize.transaction();

    // Check if user exists and vendor exists in parallel
    let user = await UserModel.findOne({
      where: {
        mobile_number: mobileNumber,
      },
      attributes: [ 'id', 'mobile_number' ],
      transaction,
    });

    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
      attributes: [ 'id' ],
      transaction,
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    // If user doesn't exist for this vendor, create a new user
    if (!user) {
      const userRole = await RoleModel.findOne({
        where: { name: 'USER' },
        attributes: [ 'id', 'name' ],
        transaction,
      });

      if (!userRole) {
        throw new NotFoundError('User role not found');
      }

      const concurrencyStamp = uuidV4();

      const newUser = await UserModel.create(
        {
          concurrency_stamp: concurrencyStamp,
          mobile_number: mobileNumber,
          profile_status: 'INCOMPLETE',
          status: 'ACTIVE',
        },
        { transaction },
      );

      // Create user_roles_mappings entry
      const mappingConcurrencyStamp = uuidV4();

      await UserRolesMappingModel.create(
        {
          vendor_id: vendorId,
          user_id: newUser.id,
          role_id: userRole.id,
          status: 'ACTIVE',
          concurrency_stamp: mappingConcurrencyStamp,
        },
        { transaction },
      );

      // Create notification for new user registration (after transaction commit)
      transaction.afterCommit(async () => {
        try {
          await createUserRegistrationNotification({
            userId: newUser.id,
            userName: null, // User name not available at registration
            userEmail: null, // User email not available at registration
            mobileNumber,
            vendorId,
            branchId: null, // Branch ID not available at this point
            roleName: userRole.name,
          });
        } catch (error) {
          console.error('Error creating user registration notification:', error);
          // Don't fail registration if notification fails
        }
      });

      user = newUser ?? user;
    }

    // Send SMS
    const smsResult = await sendSMS(mobileNumber, message);

    if (!smsResult.success) {
      throw new ValidationError(smsResult.error);
    }

    const userId = user.id;

    // Create or update OTP entry
    const otpEntry = await OTPModel.findOne({
      where: { user_id: userId },
      attributes: [ 'id', 'user_id' ],
      transaction,
    });

    if (otpEntry) {
      await OTPModel.update(
        { otp, status: 'ACTIVE', mobile_number: mobileNumber },
        {
          where: { user_id: userId },
          transaction,
        },
      );
    } else {
      const otpData = {
        user_id: userId,
        otp,
        mobile_number: mobileNumber,
        status: 'ACTIVE',
      };

      await OTPModel.create(otpData, { transaction });
    }

    await transaction.commit();

    return { messageId: smsResult.messageId, success: true };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to send OTP');
  }
};

const verifyOtpSMSForUser = async (payload) => {
  const { mobileNumber, otp, vendorId } = payload;

  const transaction = await sequelize.transaction();

  try {
    const user = await UserModel.findOne({
      where: {
        mobile_number: mobileNumber,
      },
      attributes: [ 'id', 'name', 'mobile_number', 'email', 'status', 'profile_status', 'concurrency_stamp', 'password' ],
      include: [
        {
          model: UserRolesMappingModel,
          as: 'roleMappings',
          where: {
            vendor_id: vendorId,
            status: 'ACTIVE',
          },
          required: true,
          attributes: [ 'id', 'user_id', 'role_id', 'vendor_id', 'status' ],
          include: [ {
            model: RoleModel,
            as: 'role',
            attributes: [ 'id', 'name' ],
          } ],
        },
      ],
    });

    if (!user) {
      throw new NotFoundError('User not found. Please send OTP first.');
    }

    const userId = user.id;

    const otpResult = await OTPModel.findOne({
      where: { user_id: userId },
      attributes: [ 'id', 'user_id', 'otp', 'status', 'mobile_number' ],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!otpResult || otpResult.dataValues.status === 'INACTIVE') {
      throw new ValidationError('OTP not valid. Please try again');
    }

    const { otp: otpResponse } = otpResult;

    if (otpResponse !== otp) {
      throw new ValidationError('Invalid OTP.');
    }

    // Mark OTP as inactive
    await OTPModel.update(
      { status: 'INACTIVE' },
      { where: { user_id: userId }, transaction },
    );

    await transaction.commit();

    // Extract only required fields and role name from user_roles_mappings
    const userData = convertSnakeToCamel(user.dataValues);
    const roleMapping = user.dataValues.roleMappings && user.dataValues.roleMappings[0];
    const roleData = roleMapping && roleMapping.role ? convertSnakeToCamel(roleMapping.role.dataValues) : null;
    const mappingData = roleMapping ? convertSnakeToCamel(roleMapping.dataValues) : null;

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
    };

    // Generate JWT token
    // Use password if available, otherwise use concurrency_stamp for token secret
    const tokenSecret = config.jwt.token_secret;

    const token = jwt.sign(userData, tokenSecret, {
      expiresIn: config.jwt.token_life,
    });

    return {
      doc: {
        message: 'OTP verified successfully. User logged in.',
        user: userResponse,
        token,
      },
    };
  } catch (error) {
    await transaction.rollback();

    return handleServiceError(error, 'Transaction failed');
  }
};

module.exports = {
  sendOtpSMSForUser,
  verifyOtpSMSForUser,
};
