const { InventoryMovement: InventoryMovementService } = require('../services');
const {
  handleServerError,
  sendErrorResponse,
  extractErrorMessage,
  createPaginationObject,
} = require('../utils/helper');

const getInventoryMovements = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const { vendorId, branchId } = req.user; // Get from token (VENDOR_ADMIN)

    // Filter by vendor/branch from token
    const queryData = {
      ...data,
      vendorId: data.vendorId || vendorId,
      branchId: data.branchId || branchId,
    };

    const {
      errors: err, doc, totalCount,
    } = await InventoryMovementService.getInventoryMovements(queryData);

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    const { pageSize, pageNumber } = data;
    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({
      success: true,
      doc,
      pagination,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const adjustInventory = async (req, res) => {
  try {
    const data = req.validatedData;
    const { id: userId, vendorId, branchId } = req.user; // Get from token (VENDOR_ADMIN)

    const { errors: err, doc } = await InventoryMovementService.adjustInventory({
      data: {
        ...data,
        userId,
        vendorId: data.vendorId || vendorId,
        branchId: data.branchId || branchId,
      },
    });

    if (doc) {
      return res.status(200).json({ success: true, message: 'Inventory adjusted successfully', doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  getInventoryMovements,
  adjustInventory,
};
