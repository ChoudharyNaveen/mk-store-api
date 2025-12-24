const { Cart: CartService } = require('../services')
const {
  saveCart: saveCartSchema,
  getCart: getCartSchema,
  updateCart: updateCartSchema,
  deleteCart: deleteCartSchema,
} = require('../schemas')
const Validator = require('../utils/validator')

const saveCart = async (req, res) => {
  try {
    const {
      body,
      user: { publicId: createdBy },
    } = req

    const data = { ...body, createdBy }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: saveCartSchema,
    })
    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc, isexists } = await CartService.saveCart(data)

    if (isexists) {
      return res.postSuccessfully({ message: 'item already added to cart' })
    }
    if (doc) {
      return res.postSuccessfully({ doc: doc,message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const getCart = async (req, res) => {
  try {
    const {
      query: {
        pageSize: pageSizeString,
        pageNumber: pageNumberString,
        ...query
      },
    } = req

    const pageNumber = parseInt(pageNumberString || 1)
    const pageSize = parseInt(pageSizeString || 10)

    const data = {
      ...query,
      pageNumber,
      pageSize,
    }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: getCartSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await CartService.getCartOfUser(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const deleteCart = async (req, res) => {
  try {
    const { cartId } = req.query

    const data = { cartId }

    const { errors: validationErrors } = Validator.isSchemaValid({
      data,
      schema: deleteCartSchema,
    })

    if (validationErrors) {
      return res.badRequest('field-validation', validationErrors)
    }

    const { errors, doc } = await CartService.deleteCart(cartId)
    if (doc) {
      res.setHeader('message', 'successfully deleted')
      return res.deleted()
    }
    return res.status(400).json(errors)
  } catch (error) {
    return res.serverError(error)
  }
}

const updateCart = async (req, res) => {
  try {
    const {
      body,
      params: { publicId },
      user: { publicId: updatedBy },
      headers: { 'x-concurrencystamp': concurrencyStamp },
    } = req

    const data = {
      ...body,
      publicId,
      concurrencyStamp,
      updatedBy,
    }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: updateCartSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const {
      errors: err,
      concurrencyError,
      doc,
      cartZero
    } = await CartService.updateCart(data)

    if (cartZero) {
      return res.json({message: cartZero})
    }

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
    console.log(error)
    return res.serverError(error)
  }
}

module.exports = {
  saveCart,
  getCart,
  deleteCart,
  updateCart
}
