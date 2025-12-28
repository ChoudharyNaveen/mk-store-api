const { Brand: BrandService } = require('../services');
const { handleServerError, sendErrorResponse, extractErrorMessage } = require('../utils/helper');

const saveBrand = async (req, res) => {
  try {
    const data = req.validatedData;
    const logoFile = req.files.file ? req.files.file[0] : null;

    const { errors: err, doc } = await BrandService.saveBrand({
      data,
      logoFile,
    });

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateBrand = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const logoFile = req.files.file ? req.files.file[0] : null;

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await BrandService.updateBrand({ data, logoFile });

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

const getBrand = async (req, res) => {
  try {
    const data = req.validatedData;

    const { count, doc } = await BrandService.getBrand(data);

    return res.status(200).json({ success: true, doc, count });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { brandId } = req.validatedData;

    const { errors, doc } = await BrandService.deleteBrand(brandId);

    if (doc) {
      res.setHeader('message', 'successfully deleted');

      return res.status(200).json({ success: true, message: 'successfully deleted' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(errors), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveBrand,
  updateBrand,
  getBrand,
  deleteBrand,
};
