const { Cart: CartService } = require('../services')

const saveCart = async (req, res) => {
  try {
    const data = req.validatedData

    const { errors: err, doc, isexists } = await CartService.saveCart(data)

    if (isexists) {
      return res.postSuccessfully({ message: 'item already added to cart' })
    }
    if (doc) {
      return res.postSuccessfully({ doc: doc, message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const getCart = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await CartService.getCartOfUser(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const deleteCart = async (req, res) => {
  try {
    const { cartId } = req.validatedData

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
    const data = { ...req.validatedData, id: req.params.id }

    const {
      errors: err,
      concurrencyError,
      doc,
      cartZero
    } = await CartService.updateCart(data)

    if (cartZero) {
      return res.json({ message: cartZero })
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
