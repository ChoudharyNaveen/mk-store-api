const { ProductImage: ProductImageService } = require('../services');
const {
  handleServerError,
  sendErrorResponse,
  extractErrorMessage,
  createPaginationObject,
} = require('../utils/helper');

const saveProductImages = async (req, res) => {
  try {
    const data = req.validatedData;
    // eslint-disable-next-line no-nested-ternary
    const imageFiles = req.files?.files || req.files?.file ? (Array.isArray(req.files.files || req.files.file)
      ? (req.files.files || req.files.file) : [ req.files.files || req.files.file ]) : null;
    const { id: userId } = req.user;

    const { errors: err, doc } = await ProductImageService.saveProductImages({
      data: { ...data, createdBy: userId },
      imageFiles,
    });

    if (doc) {
      return res.status(201).json({ success: true, message: 'Product images added successfully', doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateProductImage = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const { id: userId } = req.user;

    const { errors: err, concurrencyError, doc } = await ProductImageService.updateProductImage({
      data: { ...data, updatedBy: userId },
    });

    if (concurrencyError) {
      return sendErrorResponse(res, 409, 'Concurrency error', 'CONCURRENCY_ERROR');
    }

    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'successfully updated.');

      return res.status(200).json({ success: true, message: 'Product image updated successfully', doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    const { errors: err, doc } = await ProductImageService.deleteProductImage(id);

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      message: 'Product image deleted successfully',
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getProductImages = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const {
      errors: err, doc, totalCount,
    } = await ProductImageService.getProductImages(data);

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

module.exports = {
  saveProductImages,
  updateProductImage,
  deleteProductImage,
  getProductImages,
};
