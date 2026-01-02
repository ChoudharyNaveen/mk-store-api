const { Cart: CartService } = require('../services');
const { handleServerError, sendErrorResponse, extractErrorMessage } = require('../utils/helper');

const saveCart = async (req, res) => {
  try {
    const data = req.validatedData;

    const { errors: err, doc, isexists } = await CartService.saveCart(data);

    if (isexists) {
      return res.status(200).json({ success: true, message: 'item already added to cart' });
    }
    if (doc) {
      return res.status(201).json({ success: true, doc, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const getCart = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await CartService.getCartOfUser(data);

    const pagination = {
      pageSize: Number(pageSize) || 10,
      pageNumber: Number(pageNumber) || 1,
      totalCount: totalCount || 0,
      paginationEnabled: !!(pageSize && pageNumber),
    };

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const deleteCart = async (req, res) => {
  try {
    const { cartId } = req.validatedData;

    const { errors, doc } = await CartService.deleteCart(cartId);

    if (doc) {
      res.setHeader('message', 'successfully deleted');

      return res.status(200).json({ success: true, message: 'successfully deleted' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateCart = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };

    const {
      errors: err,
      concurrencyError,
      doc,
      cartZero,
    } = await CartService.updateCart(data);

    if (cartZero) {
      return res.json({ message: cartZero });
    }

    if (concurrencyError) {
      return sendErrorResponse(res, 409, 'Concurrency error', 'CONCURRENCY_ERROR');
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'successfully updated.');

      return res.status(200).json({ success: true, message: 'successfully updated' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveCart,
  getCart,
  deleteCart,
  updateCart,
};
