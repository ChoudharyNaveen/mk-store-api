const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User: UserService } = require('../services');
const config = require('../config/index');
const Helper = require('../utils/helper');

const { handleServerError, sendErrorResponse, extractErrorMessage } = Helper;
const { user_roles_mappings: UserRolesMappingModel, role: RoleModel } = require('../database');

// Create Super Admin
const createSuperAdmin = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const imageFile = req.files.file ? req.files.file[0] : null;

    const { errors: err, doc } = await UserService.createSuperAdmin({
      data,
      imageFile,
    });

    if (doc) {
      return res.status(201).json({
        success: true,
        message: 'Super admin created successfully',
        doc,
      });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Auth Login (similar to verifyOtpSms but with email/password)
const authLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendErrorResponse(res, 400, 'Email and password are required', 'VALIDATION_ERROR');
    }

    // Find user by email
    const user = await UserService.findUserByEmail({ email });

    if (!user) {
      return sendErrorResponse(res, 401, 'User not found. Please sign up first.', 'AUTHENTICATION_FAILED');
    }

    const userData = Helper.convertSnakeToCamel(user.dataValues);

    // Check if user has password
    if (!userData.password) {
      return sendErrorResponse(res, 401, 'Invalid credentials', 'AUTHENTICATION_FAILED');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return sendErrorResponse(res, 401, 'Invalid credentials', 'AUTHENTICATION_FAILED');
    }

    // Get role mappings and role information
    const roleMappings = await UserRolesMappingModel.findAll({
      where: {
        user_id: userData.id,
        status: 'ACTIVE',
      },
      include: [
        {
          model: RoleModel,
          as: 'role',
        },
      ],
    });

    // Extract role and vendor information
    const roleMapping = roleMappings && roleMappings[0];
    const roleData = roleMapping && roleMapping.role
      ? Helper.convertSnakeToCamel(roleMapping.role.dataValues)
      : null;
    const mappingData = roleMapping
      ? Helper.convertSnakeToCamel(roleMapping.dataValues)
      : null;

    // Prepare user response (similar to verifyOtpSms response)
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

    // Generate JWT token (same as verifyOtpSms)
    const tokenSecret = config.jwt.token_secret;

    const token = jwt.sign(userResponse, tokenSecret, {
      expiresIn: config.jwt.token_life,
    });

    // Return same response format as verifyOtpSms
    return res.status(200).json({
      doc: {
        message: 'Login successful. User authenticated.',
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Create Vendor Admin
const createVendorAdmin = async (req, res) => {
  try {
    const data = req.validatedData;

    const imageFile = req.files.file ? req.files.file[0] : null;

    const { errors: err, doc } = await UserService.createVendorAdmin({ data, imageFile });

    if (doc) {
      return res.status(201).json({ success: true, message: 'Vendor admin created successfully', doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const imageFile = req.files.file ? req.files.file[0] : null;

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await UserService.updateUser({ data, imageFile });

    if (concurrencyError) {
      return sendErrorResponse(res, 409, 'Concurrency error', 'CONCURRENCY_ERROR');
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'successfully updated.');

      return res.status(200).json({ success: true, message: 'successfully updated' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Convert User to Rider
const convertUserToRider = async (req, res) => {
  try {
    const { userId } = req.validatedData || req.body;

    const { errors: err, doc } = await UserService.convertUserToRider({ userId });

    if (doc) {
      return res.status(201).json({
        success: true,
        message: 'User successfully converted to rider',
        doc,
      });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return sendErrorResponse(res, 401, 'User ID not found in token', 'AUTHENTICATION_FAILED');
    }

    const { errors: err, doc } = await UserService.getUserProfile({ id: userId });

    if (err) {
      return sendErrorResponse(res, 404, extractErrorMessage(err), 'NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  createSuperAdmin,
  authLogin,
  createVendorAdmin,
  updateUser,
  convertUserToRider,
  getUserProfile,
};
