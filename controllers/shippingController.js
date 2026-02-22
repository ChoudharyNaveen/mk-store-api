const { Shipping: ShippingService } = require('../services');
const {
  handleServerError,
  sendErrorResponse,
  extractErrorMessage,
} = require('../utils/helper');
const { address: AddressModel } = require('../database');

const checkServiceability = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const {
      branchId, latitude, longitude, maxDistance,
    } = data;

    const { errors: err, serviceable, distance } = await ShippingService.checkServiceability(
      branchId,
      latitude,
      longitude,
      maxDistance,
    );

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      doc: {
        serviceable,
        distance,
      },
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const findNearbyBranches = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const {
      latitude, longitude, vendorId,
    } = data;

    const { errors: err, doc } = await ShippingService.findNearbyBranches(
      latitude,
      longitude,
      vendorId,
    );

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const calculateShippingCharges = async (req, res) => {
  try {
    const data = req.validatedData || req.body;
    const {
      branchId, addressId, latitude, longitude, orderAmount, deliveryType,
    } = data;
    const { id: userId } = req.user;

    let finalLatitude = latitude;
    let finalLongitude = longitude;

    // If addressId is provided, fetch address coordinates
    if (addressId) {
      const address = await AddressModel.findOne({
        where: { id: addressId, created_by: userId },
        attributes: [ 'id', 'latitude', 'longitude', 'created_by' ],
      });

      if (!address) {
        return sendErrorResponse(
          res,
          404,
          'Address not found or does not belong to you',
          'NOT_FOUND',
        );
      }

      if (!address.latitude || !address.longitude) {
        return sendErrorResponse(
          res,
          400,
          'Address does not have coordinates. Please provide latitude and longitude directly.',
          'VALIDATION_ERROR',
        );
      }

      finalLatitude = parseFloat(address.latitude);
      finalLongitude = parseFloat(address.longitude);
    }

    // Validate that we have coordinates (either from addressId or direct input)
    if (!finalLatitude || !finalLongitude) {
      return sendErrorResponse(
        res,
        400,
        'Either addressId OR (latitude and longitude) must be provided',
        'VALIDATION_ERROR',
      );
    }

    const { errors: err, doc } = await ShippingService.calculateShippingCharges(
      branchId,
      finalLatitude,
      finalLongitude,
      orderAmount,
      deliveryType,
    );

    if (err) {
      return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
    }

    return res.status(200).json({
      success: true,
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const saveBranchShippingConfig = async (req, res) => {
  try {
    const data = req.validatedData;
    const { id: userId } = req.user;

    const { errors: err, doc } = await ShippingService.saveBranchShippingConfig({
      data: { ...data, createdBy: userId },
    });

    if (doc) {
      return res.status(201).json({ success: true, message: 'Branch shipping config saved successfully', doc });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const getBranchShippingConfig = async (req, res) => {
  try {
    const { branchId } = req.params;

    const { errors: err, doc } = await ShippingService.getBranchShippingConfig(branchId);

    if (err) {
      return sendErrorResponse(res, 404, extractErrorMessage(err), 'NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      doc,
    });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  checkServiceability,
  findNearbyBranches,
  calculateShippingCharges,
  saveBranchShippingConfig,
  getBranchShippingConfig,
};
