const { Address: AddressService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const saveAddress = async (req, res) => {
  try {
    const data = req.validatedData;
    const { user } = req;

    const { errors: err, doc } = await AddressService.saveAddress({ ...data, createdBy: user.id });

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updateAddress = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await AddressService.updateAddress(data);

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

const getAddress = async (req, res) => {
  try {
    const data = req.validatedData;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await AddressService.getAddress(data);

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveAddress,
  updateAddress,
  getAddress,
};
