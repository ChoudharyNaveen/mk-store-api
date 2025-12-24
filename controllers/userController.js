const { User: UserService } = require('../services')
const bcrypt = require('bcrypt')
const config = require('../config/index')
const jwt = require('jsonwebtoken')
const Helper = require('../utils/helper')

const userSignUp = async (req, res) => {
  try {
    const data = req.validatedData || req.body

    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const { errors: err, doc } = await UserService.userSignUp({
      data,
      imageFile,
    })
    if (doc) {
      return res.postRequest(doc)
    }

    return res.status(400).json({ error: err })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const riderLogin = async (req, res) => {
  try {
    const data = req.validatedData || req.body

    var userData = await UserService.findUserByEmailOrMobile(data)

    if (!userData) {
      return res
        .status(401)
        .send({ success: false, message: 'Invalid Credentials' })
    }

    userData = Helper.convertSnakeToCamel(userData.dataValues)

    const passwordMatch = await bcrypt.compare(data.password, userData.password)
    if (!passwordMatch) {
      return res.status(401).send({
        success: false,
        message: 'Incorrect Password. Please check and try again',
      })
    }

    const tokenSecret = config.jwt.token_secret + userData.password

    const token = jwt.sign(userData, tokenSecret, {
      expiresIn: config.jwt.token_life,
    })

    userData.access_token = token
    delete userData.password

    res.setHeader('token', token)
    return res.getRequest(userData)
  } catch (error) {
    console.log(error)
    return {
      errors: [{ name: 'transaction', message: 'Invalid transaction' }],
    }
  }
}

const userLogin = async (req, res) => {
  try {
    const data = req.validatedData || req.body

    var userData = await UserService.findUserByEmailOrMobile(data)

    if (!userData) {
      return res
        .status(401)
        .send({ success: false, message: 'Invalid Credentials' })
    }

    userData = Helper.convertSnakeToCamel(userData.dataValues)

    const passwordMatch = await bcrypt.compare(data.password, userData.password)
    if (!passwordMatch) {
      return res.status(401).send({
        success: false,
        message: 'Incorrect Password. Please check and try again',
      })
    }

    const tokenSecret = config.jwt.token_secret + userData.password

    const token = jwt.sign(userData, tokenSecret, {
      expiresIn: config.jwt.token_life,
    })

    userData.access_token = token
    delete userData.password

    res.setHeader('token', token)
    return res.getRequest(userData)
  } catch (error) {
    console.log(error)
    return {
      errors: [{ name: 'transaction', message: 'Invalid transaction' }],
    }
  }
}

const getTotalUsers = async (req, res) => {
  try {
    const result = await UserService.getTotalUsers()
    if (result) {
      return res.getRequest(result)
    }
    return res.badRequest()
  } catch (error) {
    return res.serverError(error)
  }
}

const updateUser = async (req, res) => {
  try {
    const data = req.validatedData
    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await UserService.updateUser({ data, imageFile })

    if (concurrencyError) {
      return res.concurrencyError()
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc
      res.setHeader('x-concurrencystamp', stamp)
      res.setHeader('message', 'successfully updated.')

      return res.updated()
    }

    return res.status(400).json(err)
  } catch (error) {
    return res.serverError(error)
  }
}

const adminLogin = async (req, res) => {
  try {
    const data = req.validatedData || req.body

    var userData = await UserService.findUserByEmail(data)

    if (!userData) {
      return res
        .status(401)
        .send({ success: false, message: 'InValid Credentials' })
    }

    if (userData?.role?.dataValues?.name !== 'admin') {
      return res.status(401).send({ success: false, message: 'Access Denied' })
    }
    userData = Helper.convertSnakeToCamel(userData.dataValues)
    const passwordMatch = await bcrypt.compare(data.password, userData.password)
    if (!passwordMatch) {
      return res.status(401).send({
        success: false,
        message: 'Incorrect Password. Please check and try again',
      })
    }
    const tokenSecret = config.jwt.token_secret + userData.password
    const refreshTokenSecret =
      config.jwt.refresh_token_secret + userData.password
    const token = jwt.sign(userData, tokenSecret, {
      expiresIn: config.jwt.token_life,
    })
    userData.access_token = token
    delete userData.password

    res.setHeader('token', token)
    return res.getRequest(userData)
  } catch (error) {
    console.log(error)
    return {
      errors: [{ name: 'transaction', message: 'InValid transaction' }],
    }
  }
}

const customerSignUp = async (req, res) => {
  try {
    const data = req.validatedData || req.body

    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const { errors: err, doc } = await UserService.customerSignUp({
      data,
      imageFile,
    })
    if (doc) {
      return res.postRequest(doc)
    }

    return res.status(400).json({ error: err })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const updateUserProfile = async (req, res) => {
  try {
    const data = req.validatedData
    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await UserService.updateUserProfile({ data, imageFile })

    if (concurrencyError) {
      return res.concurrencyError()
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc
      res.setHeader('x-concurrencystamp', stamp)
      res.setHeader('message', 'Profile updated successfully. Profile status set to COMPLETE.')

      return res.updated()
    }

    return res.status(400).json(err)
  } catch (error) {
    return res.serverError(error)
  }
}

const createVendorAdmin = async (req, res) => {
  try {
    const data = req.validatedData

    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const { errors: err, doc } = await UserService.createVendorAdmin({ data, imageFile })

    if (doc) {
      return res.postSuccessfully({ message: 'Vendor admin created successfully', doc })
    }

    return res.status(400).json({ error: err })
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

module.exports = {
  userSignUp,
  userLogin,
  getTotalUsers,
  updateUser,
  adminLogin,
  customerSignUp,
  riderLogin,
  updateUserProfile,
  createVendorAdmin,
}
