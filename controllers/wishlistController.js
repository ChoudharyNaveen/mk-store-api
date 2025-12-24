const { Wishlist: WishlistService } = require('../services')
const {
  saveWishlist: saveWishlistSchema,
  getWishlist: getWishlistSchema,
  deleteWishlist: deleteWishlistSchema,
} = require('../schemas')
const Validator = require('../utils/validator')

const saveWishlist = async (req, res) => {
  try {
    const {
      body,
      user: { publicId: createdBy },
    } = req

    const data = { ...body, createdBy }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: saveWishlistSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc , isexists} = await WishlistService.saveWishlist(data)
    if (isexists) {
      return res.postSuccessfully({message: 'item already added to wishlist'})
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
    const {
      query: {
        pageSize: pageSizeString,
        pageNumber: pageNumberString,
        ...query
      },
      user: { publicId: createdBy },
    } = req

    const pageNumber = parseInt(pageNumberString || 1)
    const pageSize = parseInt(pageSizeString || 10)

    const data = {
      ...query,
      pageNumber,
      pageSize,
      createdBy
    }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: getWishlistSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await WishlistService.getWishlist(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const deleteWishlist = async (req, res) => {
  try {
    const { wishlistId } = req.query

    const data = { wishlistId }

    const { errors: validationErrors } = Validator.isSchemaValid({
      data,
      schema: deleteWishlistSchema,
    })

    if (validationErrors) {
      return res.badRequest('field-validation', validationErrors)
    }

    const { errors, doc } = await WishlistService.deleteWishlist(
      wishlistId
    )
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
