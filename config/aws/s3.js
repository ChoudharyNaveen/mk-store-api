/* eslint-disable import/no-extraneous-dependencies */
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const config = require('../index');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUCKET_NAME = config.AWS?.S3_BUCKET_NAME;
const AWS_REGION = config.AWS?.REGION || 'us-east-1';

if (!BUCKET_NAME) {
  console.warn(
    'WARNING: AWS_S3_BUCKET_NAME is not configured. File uploads will fail until this is set.',
  );
}

// ============================================================================
// AWS S3 CLIENT INITIALIZATION
// ============================================================================

/**
 * Initialize AWS S3 Client
 */
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: config.AWS?.ACCESS_KEY_ID,
    secretAccessKey: config.AWS?.SECRET_ACCESS_KEY,
  },
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate bucket name
 * @throws {Error} If bucket name is not configured
 */
function validateBucketName(bucketName = BUCKET_NAME) {
  if (!bucketName) {
    throw new Error(
      'S3 bucket name is not configured. Please set AWS_S3_BUCKET_NAME environment variable.',
    );
  }
}

// ============================================================================
// S3 KEY BUILDERS
// ============================================================================

/**
 * Build S3 key with vendor/branch path structure
 * @param {number|string} vendorId - Vendor ID
 * @param {number|string} branchId - Branch ID
 * @param {string} filename - Filename
 * @returns {string} - S3 key in format vendor/{vendorId}/{branchId}/{filename}
 */
function buildVendorS3Key(vendorId, branchId, filename) {
  return `vendor/${vendorId}/${branchId}/${filename}`;
}

/**
 * Build S3 key for user files
 * @param {number|string} userId - User ID
 * @param {string} filename - Filename
 * @returns {string} - S3 key in format users/{userId}/{filename}
 */
function buildUserS3Key(userId, filename) {
  return `users/${userId}/${filename}`;
}

// ============================================================================
// S3 URL GENERATORS
// ============================================================================

/**
 * Get S3 public URL (standard URL)
 * @param {string} key - S3 object key
 * @returns {string} - S3 file URL
 */
function getS3Url(key) {
  validateBucketName();

  // For us-east-1, AWS uses s3.amazonaws.com without region
  const regionPart = AWS_REGION === 'us-east-1' ? '' : `.${AWS_REGION}`;

  return `https://${BUCKET_NAME}.s3${regionPart}.amazonaws.com/${key}`;
}

/**
 * Get pre-signed URL for S3 object
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration time in seconds (default: 86400 = 1 day)
 * @param {string} bucketName - Optional bucket name, defaults to configured bucket
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getPreSignedUrl(key, expiresIn = 86400, bucketName = BUCKET_NAME) {
  validateBucketName(bucketName);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return url;
}

/**
 * Get pre-signed URL for vendor file
 * @param {number|string} vendorId - Vendor ID
 * @param {number|string} branchId - Branch ID
 * @param {string} filename - Filename
 * @param {number} expiresIn - Expiration time in seconds (default: 86400 = 1 day)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getVendorPreSignedUrl(vendorId, branchId, filename, expiresIn = 86400) {
  const key = buildVendorS3Key(vendorId, branchId, filename);

  return getPreSignedUrl(key, expiresIn);
}

/**
 * Get pre-signed URL for user file
 * @param {number|string} userId - User ID
 * @param {string} filename - Filename
 * @param {number} expiresIn - Expiration time in seconds (default: 86400 = 1 day)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getUserPreSignedUrl(userId, filename, expiresIn = 86400) {
  const key = buildUserS3Key(userId, filename);

  return getPreSignedUrl(key, expiresIn);
}

/**
 * Extract S3 key from S3 URL
 * @param {string} url - S3 URL
 * @returns {string|null} - S3 key or null if URL is invalid
 */
function extractS3KeyFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Handle URLs like: https://bucket-name.s3.region.amazonaws.com/key
    // or: https://bucket-name.s3.amazonaws.com/key
    const urlObj = new URL(url);
    const { pathname } = urlObj;

    // Remove leading slash
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch (error) {
    // If URL parsing fails, try regex extraction
    const match = url.match(/s3[.-][^/]+\/amazonaws\.com\/(.+)$/i);

    return match ? match[1] : null;
  }
}

/**
 * Convert S3 URL to pre-signed URL
 * @param {string} url - S3 URL
 * @param {number} expiresIn - Expiration time in seconds (default: 86400 = 1 day)
 * @returns {Promise<string>} - Pre-signed URL or original URL if conversion fails
 */
async function convertUrlToPreSignedUrl(url, expiresIn = 86400) {
  if (!url || url === 'NA' || url.trim() === '') {
    return url;
  }

  try {
    const key = extractS3KeyFromUrl(url);

    if (!key) {
      // If we can't extract key, return original URL
      return url;
    }

    return getPreSignedUrl(key, expiresIn);
  } catch (error) {
    console.error('Error converting URL to pre-signed URL:', error);

    // Return original URL on error
    return url;
  }
}

// ============================================================================
// S3 UPLOAD HELPERS
// ============================================================================

/**
 * Internal function to upload data to S3
 * @param {Buffer|Stream} body - File body (buffer or stream)
 * @param {string} key - S3 object key
 * @param {string} contentType - Content type
 * @param {string} contentDisposition - Content disposition header
 * @param {string} bucketName - Bucket name
 * @returns {Promise<void>}
 */
async function uploadToS3(body, key, contentType, contentDisposition, bucketName) {
  validateBucketName(bucketName);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    ContentDisposition: contentDisposition,
  });

  await s3Client.send(command);
}

// ============================================================================
// S3 UPLOAD FUNCTIONS - VENDOR FILES
// ============================================================================

/**
 * Upload file to S3 (vendor-based path)
 * @param {Object} file - Multer file object with buffer and mimetype
 * @param {string} filename - Filename (without path)
 * @param {number|string} vendorId - Vendor ID
 * @param {number|string} branchId - Branch ID
 * @param {string} bucketName - Optional bucket name, defaults to configured bucket
 * @returns {Promise<string>} - S3 file URL
 */
async function uploadFile(file, filename, vendorId, branchId, bucketName = BUCKET_NAME) {
  const key = buildVendorS3Key(vendorId, branchId, filename);

  await uploadToS3(
    file.buffer,
    key,
    file.mimetype,
    `attachment; filename="${filename}"`,
    bucketName,
  );

  return getS3Url(key);
}

/**
 * Upload buffer to S3 (vendor-based path)
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Filename (without path)
 * @param {number|string} vendorId - Vendor ID
 * @param {number|string} branchId - Branch ID
 * @param {string} contentType - Content type (e.g., 'image/jpeg')
 * @param {string} bucketName - Optional bucket name, defaults to configured bucket
 * @returns {Promise<string>} - S3 file URL
 */
async function uploadBuffer(buffer, filename, vendorId, branchId, contentType = 'image/jpeg', bucketName = BUCKET_NAME) {
  const key = buildVendorS3Key(vendorId, branchId, filename);

  await uploadToS3(
    buffer,
    key,
    contentType,
    `attachment; filename="${filename}"`,
    bucketName,
  );

  return getS3Url(key);
}

// ============================================================================
// S3 UPLOAD FUNCTIONS - USER FILES
// ============================================================================

/**
 * Upload user file to S3
 * @param {Object} file - Multer file object with buffer and mimetype
 * @param {string} filename - Filename (without path)
 * @param {number|string} userId - User ID
 * @param {string} bucketName - Optional bucket name, defaults to configured bucket
 * @returns {Promise<string>} - S3 file URL
 */
async function uploadUserFile(file, filename, userId, bucketName = BUCKET_NAME) {
  const key = buildUserS3Key(userId, filename);

  await uploadToS3(
    file.buffer,
    key,
    file.mimetype,
    `attachment; filename="${filename}"`,
    bucketName,
  );

  return getS3Url(key);
}

/**
 * Upload user buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Filename (without path)
 * @param {number|string} userId - User ID
 * @param {string} contentType - Content type (e.g., 'image/jpeg')
 * @param {string} bucketName - Optional bucket name, defaults to configured bucket
 * @returns {Promise<string>} - S3 file URL
 */
async function uploadUserBuffer(buffer, filename, userId, contentType = 'image/jpeg', bucketName = BUCKET_NAME) {
  const key = buildUserS3Key(userId, filename);

  await uploadToS3(
    buffer,
    key,
    contentType,
    `attachment; filename="${filename}"`,
    bucketName,
  );

  return getS3Url(key);
}

// ============================================================================
// S3 UPLOAD FUNCTIONS - VIDEO
// ============================================================================

/**
 * Upload video file to S3
 * @param {Object} filePath - File object with buffer or path property
 * @param {string} key - S3 object key (file path)
 * @param {string} bucketName - Optional bucket name, defaults to configured bucket
 * @returns {Promise<string>} - S3 file URL
 */
async function uploadVideo(filePath, key, bucketName = BUCKET_NAME) {
  validateBucketName(bucketName);

  let body;

  if (filePath.buffer) {
    body = filePath.buffer;
  } else if (filePath.path) {
    body = fs.createReadStream(filePath.path);
  } else {
    throw new Error('no buffer');
  }

  await uploadToS3(
    body,
    key,
    'video/mp4',
    `attachment; filename="${key.split('/').pop()}"`,
    bucketName,
  );

  console.log('upload successful');

  return getS3Url(key);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // S3 Client
  s3Client,

  // S3 Upload - Vendor files
  uploadFile,
  uploadBuffer,

  // S3 Upload - User files
  uploadUserFile,
  uploadUserBuffer,

  // S3 Upload - Video
  uploadVideo,

  // S3 Pre-signed URLs
  getPreSignedUrl,
  getVendorPreSignedUrl,
  getUserPreSignedUrl,
  convertUrlToPreSignedUrl,

  // S3 URL Generators
  getS3Url,
};
