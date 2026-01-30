const { v4: uuidV4 } = require('uuid');
const {
  banner: BannerModel,
  vendor: VendorModel,
  branch: BranchModel,
  subCategory: SubCategoryModel,
  sequelize,
} = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const { uploadFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');
const {
  NotFoundError,
  ValidationError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');

// Common banner attributes for queries
const BANNER_ATTRIBUTES = [
  'id',
  'vendor_id',
  'branch_id',
  'sub_category_id',
  'image_url',
  'display_order',
  'status',
  'created_at',
  'updated_at',
  'concurrency_stamp',
];

// Common include configuration for banner queries
const BANNER_INCLUDES = [
  {
    model: SubCategoryModel,
    as: 'subCategory',
    attributes: [ 'id', 'title' ],
    required: false,
  },
];

// Helper: Validate vendor exists
const validateVendor = async (vendorId, transaction) => {
  const vendor = await VendorModel.findOne({
    where: { id: vendorId },
    attributes: [ 'id' ],
    transaction,
  });

  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  return vendor;
};

// Helper: Validate branch exists and belongs to vendor
const validateBranch = async (branchId, vendorId, transaction) => {
  const branch = await BranchModel.findOne({
    where: { id: branchId, vendor_id: vendorId },
    attributes: [ 'id', 'vendor_id' ],
    transaction,
  });

  if (!branch) {
    throw new NotFoundError('Branch not found or does not belong to the specified vendor');
  }

  return branch;
};

// Helper: Validate subcategory exists (if provided)
const validateSubCategory = async (subCategoryId, transaction) => {
  if (!subCategoryId) {
    return null;
  }

  const subCategory = await SubCategoryModel.findOne({
    where: { id: subCategoryId },
    attributes: [ 'id' ],
    transaction,
  });

  if (!subCategory) {
    throw new NotFoundError('Subcategory not found');
  }

  return subCategory;
};

// Helper: Generate filename for banner image
const generateBannerFilename = (originalFilename) => {
  const fileExtension = originalFilename.split('.').pop();

  return `banner_${Date.now()}_${uuidV4()}.${fileExtension}`;
};

// Helper: Upload banner image to S3
const uploadBannerImage = async (imageFile, vendorId, branchId) => {
  const filename = generateBannerFilename(imageFile.originalname);

  return uploadFile(imageFile, filename, vendorId, branchId);
};

const saveBanner = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const {
    createdBy, vendorId, branchId, subCategoryId, imageUrl, ...datas
  } = data;

  // Validate that either imageFile or imageUrl is provided
  if (!imageFile && !imageUrl) {
    throw new ValidationError('Either image file or imageUrl is required');
  }

  // Validate vendor and branch (branch depends on vendor, so sequential)
  await validateVendor(vendorId, transaction);
  await validateBranch(branchId, vendorId, transaction);

  // Validate subcategory and upload image in parallel (they don't depend on each other)
  const uploadedImageUrl = imageFile ? await uploadBannerImage(imageFile, vendorId, branchId) : null;

  const finalImageUrl = uploadedImageUrl || imageUrl;
  const concurrencyStamp = uuidV4();

  const doc = {
    ...datas,
    vendorId,
    branchId,
    subCategoryId: subCategoryId || null,
    imageUrl: finalImageUrl,
    concurrencyStamp,
    createdBy,
  };

  const banner = await BannerModel.create(convertCamelToSnake(doc), {
    transaction,
  });

  // Convert image URL to CloudFront URL
  const bannerData = banner.toJSON();
  const convertedBanner = convertImageFieldsToCloudFront([ bannerData ], [ 'image_url' ])[0];

  return { doc: { banner: convertedBanner } };
}).catch((error) => handleServiceError(error, 'Failed to save banner'));

const updateBanner = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const {
    concurrencyStamp, updatedBy, vendorId, branchId, subCategoryId, imageUrl,
  } = datas;

  // Fetch banner first to get current state and validate concurrency
  const currentBanner = await BannerModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id' ],
    transaction,
  });

  if (!currentBanner) {
    throw new NotFoundError('Banner not found');
  }

  const { concurrency_stamp: stamp, vendor_id: currentVendorId, branch_id: currentBranchId } = currentBanner;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  // Prepare validation promises (only validate what's being updated)
  const validationPromises = [];

  if (vendorId) {
    validationPromises.push(validateVendor(vendorId, transaction));
  }

  if (branchId && vendorId) {
    validationPromises.push(validateBranch(branchId, vendorId, transaction));
  } else if (branchId) {
    // If branchId is provided but vendorId is not, use current vendorId
    validationPromises.push(validateBranch(branchId, currentVendorId, transaction));
  }

  if (subCategoryId !== undefined) {
    if (subCategoryId === null) {
      // Setting to null is allowed, no validation needed
      validationPromises.push(Promise.resolve(null));
    } else {
      validationPromises.push(validateSubCategory(subCategoryId, transaction));
    }
  }

  // Prepare image upload promise if file is provided
  const imageUploadPromise = imageFile
    ? uploadBannerImage(imageFile, vendorId || currentVendorId, branchId || currentBranchId)
    : null;

  // Execute validations and image upload in parallel
  const allPromises = [ ...validationPromises ];

  if (imageUploadPromise) {
    allPromises.push(imageUploadPromise);
  }

  const results = await Promise.all(allPromises);

  // Extract uploaded image URL (last result if file was provided)
  const uploadedImageUrl = imageUploadPromise ? results[results.length - 1] : null;

  // Determine final image URL
  let finalImageUrl;

  if (uploadedImageUrl) {
    finalImageUrl = uploadedImageUrl;
  } else if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
    finalImageUrl = imageUrl;
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(datas),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  // Only update imageUrl if provided (either from file upload or URL)
  if (finalImageUrl !== undefined) {
    doc.image_url = finalImageUrl;
  }

  await BannerModel.update(doc, {
    where: { id },
    transaction,
  });

  // Fetch updated banner with includes and convert image URL
  const updatedBanner = await BannerModel.findOne({
    where: { id },
    attributes: BANNER_ATTRIBUTES,
    include: BANNER_INCLUDES,
    transaction,
  });

  const bannerData = updatedBanner.toJSON();
  const convertedBanner = convertImageFieldsToCloudFront([ bannerData ], [ 'image_url' ])[0];

  return { doc: { concurrencyStamp: newConcurrencyStamp, banner: convertedBanner } };
}).catch((error) => handleServiceError(error, 'Failed to update banner'));

const getBanner = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'display_order', 'ASC' ], [ 'created_at', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    BannerModel,
    {
      where: { ...where },
      attributes: BANNER_ATTRIBUTES,
      include: BANNER_INCLUDES,
      order,
      limit,
      offset,
      distinct: true,
    },
  );

  if (response) {
    const { count, totalCount, rows } = response;

    // Convert rows to plain objects and image URLs to CloudFront URLs
    const doc = rows.map((element) => element.dataValues);
    const convertedDoc = convertImageFieldsToCloudFront(JSON.parse(JSON.stringify(doc)), [ 'image_url' ]);

    return { count, totalCount, doc: convertedDoc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const getBannerById = async (bannerId) => {
  try {
    const banner = await BannerModel.findOne({
      where: { id: bannerId },
      attributes: BANNER_ATTRIBUTES,
      include: BANNER_INCLUDES,
    });

    if (!banner) {
      return handleServiceError(new NotFoundError('Banner not found'));
    }

    const bannerData = banner.toJSON();
    const convertedBanner = convertImageFieldsToCloudFront([ bannerData ], [ 'image_url' ])[0];

    return { doc: convertedBanner };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch banner');
  }
};

const deleteBanner = async ({ data }) => withTransaction(sequelize, async (transaction) => {
  const { id, concurrencyStamp } = data;

  const banner = await BannerModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!banner) {
    throw new NotFoundError('Banner not found');
  }

  if (concurrencyStamp && concurrencyStamp !== banner.concurrency_stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  await BannerModel.destroy({
    where: { id },
    transaction,
  });

  return { doc: { message: 'Banner deleted successfully' } };
}).catch((error) => handleServiceError(error, 'Failed to delete banner'));

module.exports = {
  saveBanner,
  updateBanner,
  getBanner,
  getBannerById,
  deleteBanner,
};
