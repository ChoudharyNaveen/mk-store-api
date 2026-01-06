const { User: UserService } = require('../services');
const Helper = require('../utils/helper');
const { createPaginationObject } = require('../utils/helper');

const { handleServerError, sendErrorResponse, extractErrorMessage } = Helper;

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

// Auth Login
const authLogin = async (req, res) => {
  try {
    const data = req.validatedData || req.body;

    const { errors: err, doc } = await UserService.authLogin(data);

    if (err) {
      return sendErrorResponse(res, 401, extractErrorMessage(err), 'AUTHENTICATION_FAILED');
    }

    return res.status(200).json({
      doc,
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

// Refresh Token
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendErrorResponse(res, 400, 'Token is required', 'VALIDATION_ERROR');
    }

    const { errors: err, doc } = await UserService.refreshToken({ token });

    if (err) {
      return sendErrorResponse(res, 401, extractErrorMessage(err), 'AUTHENTICATION_FAILED');
    }

    return res.status(200).json({
      doc: {
        message: 'Token refreshed successfully',
        token: doc.token,
        user: doc.user,
      },
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

// Get Users
const getUsers = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const { tab } = req.query; // Get role name from query param
    const { vendorId } = req.user;
    const { errors: err, doc, totalCount } = await UserService.getUsers({
      ...data,
      vendorId,
      roleName: tab, // Pass role name from query param
    });

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    const { pageSize, pageNumber } = data;
    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({
      success: true,
      doc,
      pagination,
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
  refreshToken,
  getUsers,
};
