const { Order: OrderService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const placeOrder = async (req, res) => {
  try {
    const data = req.validatedData;

    const { doc, error } = await OrderService.placeOrder(data);

    if (doc) {
      return res.status(201).json({
        message: 'Order placed successfully',
        data: doc,
      });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(error), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getOrder = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await OrderService.getOrder(data);

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getStatsOfOrdersCompleted = async (req, res) => {
  try {
    const { data } = await OrderService.getStatsOfOrdersCompleted();

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateOrder = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await OrderService.updateOrder(data);

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
    return handleServerError(error, req, res);
  }
};

const getTotalReturnsOfToday = async (req, res) => {
  try {
    const { error, data } = await OrderService.getTotalReturnsOfToday();

    if (data) {
      return res.status(200).json({ success: true, total: data });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(error), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  placeOrder,
  getOrder,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
};
