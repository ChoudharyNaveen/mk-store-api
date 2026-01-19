const { Dashboard: DashboardService } = require('../services');
const { handleServerError } = require('../utils/helper');

const getDashboardKPIs = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const userId = req.user?.id;

    // Add user context if needed
    const payload = {
      ...data,
      userId,
    };

    const { doc, error } = await DashboardService.getDashboardKPIs(payload);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return res.status(400).json({ success: false, error });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getSalesOverview = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const userId = req.user?.id;

    const payload = {
      ...data,
      userId,
    };

    const { doc, error } = await DashboardService.getSalesOverview(payload);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return res.status(400).json({ success: false, error });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getSalesByCategory = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const userId = req.user?.id;

    const payload = {
      ...data,
      userId,
    };

    const { doc, error } = await DashboardService.getSalesByCategory(payload);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return res.status(400).json({ success: false, error });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getTopProducts = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const userId = req.user?.id;

    const payload = {
      ...data,
      userId,
    };

    const { doc, error } = await DashboardService.getTopProducts(payload);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return res.status(400).json({ success: false, error });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getRecentOrders = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const userId = req.user?.id;

    const payload = {
      ...data,
      userId,
    };

    const { doc, error } = await DashboardService.getRecentOrders(payload);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return res.status(400).json({ success: false, error });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getExpiringProducts = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const userId = req.user?.id;

    const payload = {
      ...data,
      userId,
    };

    const { count, totalCount, doc, error } = await DashboardService.getExpiringProducts(payload);

    if (doc !== undefined) {
      const { pageSize, pageNumber } = data;
      const { createPaginationObject } = require('../utils/helper');
      const pagination = createPaginationObject(pageSize, pageNumber, totalCount);
      return res.status(200).json({ success: true, doc, pagination });
    }

    return res.status(400).json({ success: false, error });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  getDashboardKPIs,
  getSalesOverview,
  getSalesByCategory,
  getTopProducts,
  getRecentOrders,
  getExpiringProducts,
};
