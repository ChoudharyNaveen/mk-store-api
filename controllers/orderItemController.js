const { OrderItem: OrderItemService } = require('../services');
const { handleServerError } = require('../utils/helper');

const getOrderItem = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await OrderItemService.getOrderItem(data);

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

module.exports = {
  getOrderItem,
};
