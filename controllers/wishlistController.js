const { Wishlist: WishlistService } = require('../services');
const { handleServerError, sendErrorResponse, extractErrorMessage } = require('../utils/helper');

const saveWishlist = async (req, res) => {
  try {
    const data = req.validatedData;

    const { errors: err, doc, isexists } = await WishlistService.saveWishlist(data);

    if (isexists) {
      return res.status(200).json({ success: true, message: 'item already added to wishlist' });
    }
    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const getWishlist = async (req, res) => {
  try {
    const data = req.validatedData;

    const { count, doc } = await WishlistService.getWishlist(data);

    return res.status(200).json({ success: true, doc, count });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const deleteWishlist = async (req, res) => {
  try {
    const { wishlistId } = req.validatedData;

    const { errors, doc } = await WishlistService.deleteWishlist(wishlistId);

    if (doc) {
      res.setHeader('message', 'successfully deleted');

      return res.status(200).json({ success: true, message: 'successfully deleted' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveWishlist,
  getWishlist,
  deleteWishlist,
};
