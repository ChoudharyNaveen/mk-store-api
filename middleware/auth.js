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
    const user = jwt.decode(token)
    let userDetails = {}
    userDetails = await UserService.getUserById({ id: user.id })
    const password = userDetails.doc.password || userDetails.doc.concurrencyStamp
    const tokenSecret = config.jwt.token_secret + password;
    jwt.verify(token, tokenSecret)

    req.user = userDetails.doc
    req.user.userId = userDetails.doc.id
    next()
  } catch (error) {
    console.log('auth error', error)
    return res.status(401).send()
  }
}

module.exports = { isAuthenticated }
