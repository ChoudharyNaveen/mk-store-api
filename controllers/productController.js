const { Product: ProductService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const saveProduct = async (req, res) => {
  try {
    const data = req.validatedData;
    const imageFiles = req.files.images ? req.files.images : null; // Multiple images

    // Parse variants from JSON if provided as string (multipart/form-data)
    let { variants } = data;

    if (variants) {
      try {
        variants = JSON.parse(variants);
        // Validate: at least one variant is required
        if (!Array.isArray(variants) || variants.length === 0) {
          return sendErrorResponse(res, 400, 'At least one variant is required', 'VALIDATION_ERROR');
        }
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid variants format. Must be valid JSON string.', 'VALIDATION_ERROR');
      }
    } else {
      return sendErrorResponse(res, 400, 'At least one variant is required', 'VALIDATION_ERROR');
    }

    // Remove variants from data to avoid schema validation issues
    const {
      variants: _, ...productData
    } = data;

    const { errors: err, doc } = await ProductService.saveProduct({
      data: {
        ...productData,
        variants: variants || undefined,
        createdBy: req.user.id,
      },
      imageFiles, // Multiple image files from multipart/form-data
    });

    if (doc) {
      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        doc,
      });
    }

    return sendErrorResponse(res, 400, extractErrorMessage(err), 'VALIDATION_ERROR');
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

const updateProduct = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };
    const imageFiles = req.files.images ? req.files.images : null; // Multiple images

    // Parse JSON strings from multipart/form-data
    let {
      variants, imagesData, variantIdsToDelete, imageIdsToDelete,
    } = data;

    if (variants) {
      try {
        variants = JSON.parse(variants);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid variants format. Must be valid JSON string.', 'VALIDATION_ERROR');
      }
    }

    if (imagesData) {
      try {
        imagesData = JSON.parse(imagesData);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid imagesData format. Must be valid JSON string.', 'VALIDATION_ERROR');
      }
    }

    if (variantIdsToDelete) {
      try {
        variantIdsToDelete = JSON.parse(variantIdsToDelete);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid variantIdsToDelete format. Must be valid JSON string.', 'VALIDATION_ERROR');
      }
    }

    if (imageIdsToDelete) {
      try {
        imageIdsToDelete = JSON.parse(imageIdsToDelete);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid imageIdsToDelete format. Must be valid JSON string.', 'VALIDATION_ERROR');
      }
    }

    // Remove variants, images, and delete arrays from data
    const {
      variants: _, imagesData: __, images: ___, variantIdsToDelete: ____, imageIdsToDelete: _____,
      ...productData
    } = data;

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await ProductService.updateProduct({
      data: {
        updatedBy: req.user.id,
        createdBy: req.user.id,
        ...productData,
        variants: variants || undefined,
        imagesData: imagesData || undefined,
        variantIdsToDelete: variantIdsToDelete || undefined,
        imageIdsToDelete: imageIdsToDelete || undefined,
      },
      imageFiles, // Multiple image files from multipart/form-data
    });

    if (concurrencyError) {
      return sendErrorResponse(res, 409, 'Concurrency error', 'CONCURRENCY_ERROR');
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'successfully updated.');

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        doc,
      });
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

const getProductStats = async (req, res) => {
  try {
    const { productId } = req.validatedData;

    const { doc, error } = await ProductService.getProductStats(productId);

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
  getProductStats,
};
