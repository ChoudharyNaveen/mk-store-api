const { Product: ProductService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const saveProduct = async (req, res) => {
  try {
    const data = req.validatedData;
    const imageFile = req.files.file ? req.files.file[0] : null;

    const { errors: err, doc } = await ProductService.saveProduct({
      data,
      imageFile,
    });

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateProduct = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const imageFile = req.files.file ? req.files.file[0] : null;

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await ProductService.updateProduct({ data, imageFile });

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

const getProduct = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await ProductService.getProduct(data);

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getProductsGroupedByCategory = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await ProductService.getProductsGroupedByCategory(data);

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.validatedData;

    const { errors, doc } = await ProductService.deleteProduct(productId);

    if (doc) {
      res.setHeader('message', 'successfully deleted');

      return res.status(200).json({ success: true, message: 'successfully deleted' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;

    const { doc, error } = await ProductService.getProductDetails(productId);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return sendErrorResponse(res, 404, extractErrorMessage(error), 'NOT_FOUND');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  getProductDetails,
  deleteProduct,
};
