const { Vendor: VendorService } = require('../services');
const { handleServerError, sendErrorResponse, extractErrorMessage } = require('../utils/helper');

const saveVendor = async (req, res) => {
  try {
    const data = req.validatedData;

    const { errors: err, doc } = await VendorService.saveVendor({ data });

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updateVendor = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await VendorService.updateVendor({ data });

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

const getVendor = async (req, res) => {
  try {
    const data = req.validatedData;

    const { count, doc } = await VendorService.getVendor(data);

    return res.status(200).json({ success: true, doc, count });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getVendorByCode = async (req, res) => {
  try {
    const { code } = req.validatedData;

    const { errors: err, doc } = await VendorService.getVendorByCode(code);

    if (err) {
      return sendErrorResponse(res, 404, extractErrorMessage(err), 'NOT_FOUND');
    }

    return res.status(200).json({ success: true, doc });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveVendor,
  updateVendor,
  getVendor,
  getVendorByCode,
};
