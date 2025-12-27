const jwt = require('jsonwebtoken');
const config = require('../config/index');
const { sendErrorResponse } = require('../utils/helper');

const isAuthenticated = async (req, res, next) => {
  if (!req.headers.authorization) {
    return sendErrorResponse(res, 401, 'Unauthorized Access', 'AUTHENTICATION_FAILED');
  }
  try {
    const {
      headers: { authorization },
    } = req;
    const accessToken = authorization;
    const token = accessToken.replace('Bearer ', '');
    const tokenSecret = config.jwt.token_secret;
    const verified = jwt.verify(token, tokenSecret);

    req.user = verified;

    return next();
  } catch (error) {
    console.log('auth error', error);

    return sendErrorResponse(res, 401, 'Unauthorized Access', 'AUTHENTICATION_FAILED', error);
  }
};

const isVendorAdmin = async (req, res, next) => {
  try {
    // Ensure user is authenticated first
    if (!req.user || !req.user.userId) {
      return sendErrorResponse(res, 401, 'Unauthorized Access', 'AUTHENTICATION_FAILED');
    }

    // Check role from JWT token
    if (!req.user.roleName || req.user.roleName !== 'VENDOR_ADMIN') {
      return sendErrorResponse(res, 403, 'Access denied. Vendor admin role required.', 'FORBIDDEN');
    }

    return next();
  } catch (error) {
    console.log('vendor admin auth error', error);

    return sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR', error);
  }
};

module.exports = { isAuthenticated, isVendorAdmin };
