const { Order: OrderService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const getOrderStats = async (req, res) => {
  try {
    const data = req.validatedData;
    const { doc } = await OrderService.getOrderStats(data);

    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getDailyOrderStats = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const { vendorId } = req.user;
    const { doc } = await OrderService.getDailyOrderStats({
      ...data,
      vendorId,
    });

    return res.status(200).json({ success: true, doc });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const placeOrder = async (req, res) => {
  try {
    const data = req.validatedData;

    const { doc, errors } = await OrderService.placeOrder({ ...data, createdBy: req.user.id });

    if (doc) {
      return res.status(201).json({
        message: 'Order placed successfully',
        data: doc,
      });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
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
    const { doc, errors } = await OrderService.getStatsOfOrdersCompleted();

    if (doc) {
      return res.status(200).json({ success: true, data: doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateOrder = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id, loginUser: req.user };

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

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.validatedData;

    const { doc, error } = await OrderService.getOrderDetails(orderId);

    if (doc) {
      return res.status(200).json({ success: true, data: doc });
    }

    return sendErrorResponse(res, 404, extractErrorMessage(error) || 'Order not found', 'NOT_FOUND');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  placeOrder,
  getOrder,
  getOrderStats,
  getDailyOrderStats,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
  getOrderDetails,
};
