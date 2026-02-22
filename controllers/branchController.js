const { Branch: BranchService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');
const { NotFoundError } = require('../utils/serviceErrors');

const saveBranch = async (req, res) => {
  try {
    const data = req.validatedData;

    const { errors: err, doc } = await BranchService.saveBranch({ data });

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updateBranch = async (req, res) => {
  try {
    const data = { ...req.validatedData };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await BranchService.updateBranch({ data });

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

const getBranch = async (req, res) => {
  try {
    const data = req.validatedData;
    const { vendorId } = req.user;
    const { pageSize, pageNumber } = data;

    const { totalCount, doc } = await BranchService.getBranch({ ...data, vendorId });

    const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

    return res.status(200).json({ success: true, doc, pagination });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const contactUs = async (req, res) => {
  try {
    const { branchId } = req.validatedData;

    const { doc } = await BranchService.getBranchContact(branchId);

    return res.status(200).json({ success: true, doc });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendErrorResponse(res, 404, error.message, 'NOT_FOUND');
    }

    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveBranch,
  updateBranch,
  getBranch,
  contactUs,
};
