const { ProductType: ProductTypeService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const saveProductType = async (req, res) => {
  try {
    const data = req.validatedData;

    const { errors: err, doc } = await ProductTypeService.saveProductType({ data });

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updateProductType = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await ProductTypeService.updateProductType({ data });

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

const getProductType = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await ProductTypeService.getProductType(data);

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveProductType,
  updateProductType,
  getProductType,
};
