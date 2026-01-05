const { Category: CategoryService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const saveCategory = async (req, res) => {
  try {
    const data = req.validatedData;
    const imageFile = req.files.file ? req.files.file[0] : null;

    const { errors: err, doc } = await CategoryService.saveCategory({
      data,
      imageFile,
    });

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updateCategory = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const imageFile = req.files.file ? req.files.file[0] : null;

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await CategoryService.updateCategory({ data, imageFile });

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

const getCategory = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;
    const { totalCount, doc } = await CategoryService.getCategory(data);

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getCategoryDetails = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const { doc, error } = await CategoryService.getCategoryDetails(categoryId);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return sendErrorResponse(res, 404, extractErrorMessage(error), 'NOT_FOUND');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveCategory,
  updateCategory,
  getCategory,
  getCategoryDetails,
};
