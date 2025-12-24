const { Wishlist: WishlistService } = require('../services')

const saveWishlist = async (req, res) => {
  try {
    const data = req.validatedData

    const { errors: err, doc, isexists } = await WishlistService.saveWishlist(data)
    if (isexists) {
      return res.postSuccessfully({ message: 'item already added to wishlist' })
    }
    if (doc) {
      return res.postSuccessfully({ message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const getWishlist = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await WishlistService.getWishlist(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const deleteWishlist = async (req, res) => {
  try {
    const { wishlistId } = req.validatedData

    const { errors, doc } = await WishlistService.deleteWishlist(wishlistId)
    if (doc) {
      res.setHeader('message', 'successfully deleted')
      return res.deleted()
    }
    return res.status(400).json(errors)
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveWishlist,
  getWishlist,
  deleteWishlist
}
