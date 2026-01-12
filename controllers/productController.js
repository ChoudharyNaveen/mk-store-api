const { Product: ProductService } = require('../services');
const {
  handleServerError, sendErrorResponse, extractErrorMessage, createPaginationObject,
} = require('../utils/helper');

const saveProduct = async (req, res) => {
  try {
    const data = req.validatedData;
    const imageFile = req.files.file ? req.files.file[0] : null; // Legacy single image (backward compatibility)
    const imageFiles = req.files.images ? req.files.images : null; // Multiple images

    // Parse variants and imagesData from JSON if provided as string (multipart/form-data)
    let { variants } = data;
    let imagesData = data.imagesData || data.images; // Support both field names

    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid variants format. Must be valid JSON array.', 'VALIDATION_ERROR');
      }
    }

    if (typeof imagesData === 'string') {
      try {
        imagesData = JSON.parse(imagesData);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid imagesData format. Must be valid JSON array.', 'VALIDATION_ERROR');
      }
    }

    // Remove variants and images from data to avoid schema validation issues
    const {
      variants: _, imagesData: __, images: ___, ...productData
    } = data;

    const { errors: err, doc } = await ProductService.saveProduct({
      data: {
        ...productData,
        variants: variants || undefined,
        imagesData: imagesData || undefined,
      },
      imageFile, // Legacy support
      imageFiles, // New: multiple image files from multipart/form-data
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
    const imageFile = req.files.file ? req.files.file[0] : null; // Legacy single image (backward compatibility)
    const imageFiles = req.files.images ? req.files.images : null; // Multiple images

    // Parse variants and imagesData from JSON if provided as string (multipart/form-data)
    let { variants } = data;
    let imagesData = data.imagesData || data.images; // Support both field names

    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid variants format. Must be valid JSON array.', 'VALIDATION_ERROR');
      }
    }

    if (typeof imagesData === 'string') {
      try {
        imagesData = JSON.parse(imagesData);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid imagesData format. Must be valid JSON array.', 'VALIDATION_ERROR');
      }
    }

    // Parse variantIdsToDelete and imageIdsToDelete if provided as string
    let { variantIdsToDelete } = data;
    let { imageIdsToDelete } = data;

    if (typeof variantIdsToDelete === 'string') {
      try {
        variantIdsToDelete = JSON.parse(variantIdsToDelete);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid variantIdsToDelete format. Must be valid JSON array.', 'VALIDATION_ERROR');
      }
    }

    if (typeof imageIdsToDelete === 'string') {
      try {
        imageIdsToDelete = JSON.parse(imageIdsToDelete);
      } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid imageIdsToDelete format. Must be valid JSON array.', 'VALIDATION_ERROR');
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
        ...productData,
        variants: variants || undefined,
        imagesData: imagesData || undefined,
        variantIdsToDelete: variantIdsToDelete || undefined,
        imageIdsToDelete: imageIdsToDelete || undefined,
      },
      imageFile, // Legacy support
      imageFiles, // New: multiple image files from multipart/form-data
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

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  getProductDetails,
  deleteProduct,
};
