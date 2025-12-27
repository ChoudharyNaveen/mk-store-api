const jwt = require('jsonwebtoken');
const config = require('../config/index');

const isAuthenticated = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send();
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

    return res.status(401).json({
      success: false,
      errors: { message: 'Unauthorized Access', code: 'AUTHENTICATION_FAILED' },
    });
  }
};

const isVendorAdmin = async (req, res, next) => {
  try {
    // Ensure user is authenticated first
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        errors: { message: 'Unauthorized Access', code: 'AUTHENTICATION_FAILED' },
      });
    }

    // Check role from JWT token
    if (!req.user.roleName || req.user.roleName !== 'VENDOR_ADMIN') {
      return res.status(403).json({
        success: false,
        errors: { message: 'Access denied. Vendor admin role required.', code: 'FORBIDDEN' },
      });
    }

    return next();
  } catch (error) {
    console.log('vendor admin auth error', error);

    return res.status(500).json({
      success: false,
      errors: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
    });
  }
};

module.exports = { isAuthenticated, isVendorAdmin };
