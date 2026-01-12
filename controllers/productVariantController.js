const { ProductVariant: ProductVariantService } = require('../services');
const {
  handleServerError,
  sendErrorResponse,
  extractErrorMessage,
  createPaginationObject,
} = require('../utils/helper');

const saveProductVariant = async (req, res) => {
  try {
    const data = req.validatedData;
    const { id: userId } = req.user;

    const { errors: err, doc } = await ProductVariantService.saveProductVariant({
      data: { ...data, createdBy: userId },
    });

    if (doc) {
      return res.status(201).json({ success: true, message: 'Product variant added successfully', doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateProductVariant = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const { id: userId } = req.user;

    const { errors: err, concurrencyError, doc } = await ProductVariantService.updateProductVariant({
      data: { ...data, updatedBy: userId },
    });

    if (concurrencyError) {
      return sendErrorResponse(res, 409, 'Concurrency error', 'CONCURRENCY_ERROR');
    }

    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'successfully updated.');

      return res.status(200).json({ success: true, message: 'Product variant updated successfully', doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getProductVariants = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const {
      errors: err, doc, totalCount,
    } = await ProductVariantService.getProductVariants(data);

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

const getVariantById = async (req, res) => {
  try {
    const { variantId } = req.params;

    const { errors: err, doc } = await ProductVariantService.getVariantById(variantId);

    if (err) {
      return sendErrorResponse(res, 404, extractErrorMessage(err), 'NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const deleteProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const { errors: err, doc } = await ProductVariantService.deleteProductVariant(id);

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      message: 'Product variant deleted successfully',
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getVariantsByType = async (req, res) => {
  try {
    const { productId } = req.params;

    const { errors: err, doc } = await ProductVariantService.getVariantsByType(productId);

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveProductVariant,
  updateProductVariant,
  getProductVariants,
  getVariantById,
  deleteProductVariant,
  getVariantsByType,
};
