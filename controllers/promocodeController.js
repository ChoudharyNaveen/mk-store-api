const { Promocode: PromocodeService } = require('../services');
const { handleServerError, sendErrorResponse, extractErrorMessage } = require('../utils/helper');

const savePromocode = async (req, res) => {
  try {
    const data = req.validatedData;

    const { errors: err, doc } = await PromocodeService.savePromocode(data);

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updatePromocode = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await PromocodeService.updatePromocode(data);

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

const getPromocode = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await PromocodeService.getPromocode(data);

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
  savePromocode,
  updatePromocode,
  getPromocode,
};
