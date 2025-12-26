const { User: UserService } = require('../services')
const jwt = require('jsonwebtoken')
const config = require('../config/index')

const isAuthenticated = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send()
  }
  try {
    const {
      headers: { authorization },
    } = req
    const accessToken = authorization
    var token = accessToken.replace('Bearer ', '')
    const decoded = jwt.decode(token)
    let userDetails = {}
    userDetails = await UserService.getUserById({ id: decoded.id })
    const password = userDetails.doc.password || userDetails.doc.concurrencyStamp
    const tokenSecret = config.jwt.token_secret + password;
    const verified = jwt.verify(token, tokenSecret)

    req.user = userDetails.doc
    req.user.userId = userDetails.doc.id
    // Add role information from token
    if (verified.roleName) {
      req.user.roleName = verified.roleName
    }
    if (verified.vendorId) {
      req.user.vendorId = verified.vendorId
    }
    next()
  } catch (error) {
    console.log('auth error', error)
    return res.status(401).send()
  }
}

const isVendorAdmin = async (req, res, next) => {
  try {
    // Ensure user is authenticated first
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        errors: [{ message: 'Authentication required', name: 'auth' }],
      })
    }

    // Check role from JWT token
    if (!req.user.roleName || req.user.roleName !== 'VENDOR_ADMIN') {
      return res.status(403).json({
        errors: [
          {
            message: 'Access denied. Vendor admin role required.',
            name: 'authorization',
          },
        ],
      })
    }

    next()
  } catch (error) {
    console.log('vendor admin auth error', error)
    return res.status(500).json({
      errors: [{ message: 'Internal server error', name: 'server' }],
    })
  }
}

module.exports = { isAuthenticated, isVendorAdmin }
