const { Cart: CartService } = require('../services');
const { handleServerError } = require('../utils/helper');

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

    return res.status(400).json(err);
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const getCart = async (req, res) => {
  try {
    const data = req.validatedData;

    const { count, doc } = await CartService.getCartOfUser(data);

    return res.status(200).json({ success: true, doc, count });
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

    return res.status(400).json(errors);
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
      return res.status(409).json({ success: false, message: 'Concurrency error' });
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'successfully updated.');

      return res.status(200).json({ success: true, message: 'successfully updated' });
    }

    return res.status(400).json(err);
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
