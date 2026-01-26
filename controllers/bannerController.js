const { Banner: BannerService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const saveBanner = async (req, res) => {
  try {
    const data = req.validatedData;
    const imageFile = req.files?.file ? req.files.file[0] : null;

    // Validate that either imageFile or imageUrl is provided
    if (!imageFile && !data.imageUrl) {
      return sendErrorResponse(res, 400, 'Either image file or imageUrl is required', 'VALIDATION_ERROR');
    }

    const { errors: err, doc } = await BannerService.saveBanner({ data, imageFile });

    if (doc) {
      return res.status(201).json({ success: true, message: 'Banner created successfully' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updateBanner = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const imageFile = req.files?.file ? req.files.file[0] : null;

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await BannerService.updateBanner({ data, imageFile });

    if (concurrencyError) {
      return sendErrorResponse(res, 409, 'Concurrency error', 'CONCURRENCY_ERROR');
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'Banner updated successfully.');

      return res.status(200).json({ success: true, message: 'Banner updated successfully' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const getBanner = async (req, res) => {
  try {
    const data = req.validatedData || {};
    const { totalCount, doc } = await BannerService.getBanner(data);

    if (doc !== undefined) {
      const { pageSize, pageNumber } = data;
      const pagination = createPaginationObject(pageSize, pageNumber, totalCount);

      return res.status(200).json({ success: true, doc, pagination });
    }

    return sendErrorResponse(res, 400, 'Failed to fetch banners', 'ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const { errors: err, doc } = await BannerService.getBannerById(id);

    if (doc) {
      return res.status(200).json({ success: true, doc });
    }

    return sendErrorResponse(res, 404, extractErrorMessage(err), 'NOT_FOUND');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { id, concurrencyStamp: req.headers['x-concurrencystamp'] };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await BannerService.deleteBanner({ data });

    if (concurrencyError) {
      return sendErrorResponse(res, 409, 'Concurrency error', 'CONCURRENCY_ERROR');
    }
    if (doc) {
      return res.status(200).json({ success: true, message: 'Banner deleted successfully' });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

module.exports = {
  saveBanner,
  updateBanner,
  getBanner,
  getBannerById,
  deleteBanner,
};
