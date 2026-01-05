/* eslint-disable import/no-extraneous-dependencies */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const config = require('../index');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUCKET_NAME = config.AWS?.S3_BUCKET_NAME;
const AWS_REGION = config.AWS?.REGION || 'us-east-1';
const CLOUDFRONT_DOMAIN = config.AWS?.CLOUDFRONT_DOMAIN;

if (!BUCKET_NAME) {
  console.warn(
    'WARNING: AWS_S3_BUCKET_NAME is not configured. File uploads will fail until this is set.',
  );
}

if (!CLOUDFRONT_DOMAIN) {
  console.warn(
    'WARNING: AWS_CLOUDFRONT_DOMAIN is not configured. CloudFront URLs will not be generated.',
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
// URL GENERATORS
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
 * Get CloudFront URL for S3 object
 * @param {string} key - S3 object key
 * @returns {string} - CloudFront file URL
 */
function getCloudFrontUrl(key) {
  if (!CLOUDFRONT_DOMAIN) {
    // Fallback to S3 URL if CloudFront is not configured
    return getS3Url(key);
  }

  // Ensure CloudFront domain doesn't have trailing slash
  const domain = CLOUDFRONT_DOMAIN.replace(/\/$/, '');

  // Ensure key doesn't have leading slash
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;

  return `https://${domain}/${cleanKey}`;
}

/**
 * Extract S3 key from S3 URL or CloudFront URL
 * @param {string} url - S3 or CloudFront URL
 * @returns {string|null} - S3 key or null if URL is invalid
 */
function extractS3KeyFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const urlObj = new URL(url);
    const { pathname, hostname } = urlObj;

    // Handle CloudFront URLs
    if (CLOUDFRONT_DOMAIN && hostname.includes(CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '').split('/')[0])) {
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    }

    // Handle S3 URLs like: https://bucket-name.s3.region.amazonaws.com/key
    // or: https://bucket-name.s3.amazonaws.com/key
    if (hostname.includes('s3') && hostname.includes('amazonaws.com')) {
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    }

    // If it's already a CloudFront URL or unrecognized, return pathname
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch (error) {
    // If URL parsing fails, try regex extraction for S3 URLs
    const s3Match = url.match(/s3[.-][^/]+\/amazonaws\.com\/(.+)$/i);

    if (s3Match) {
      return s3Match[1];
    }

    // Try to extract path after domain for CloudFront
    const cloudfrontMatch = url.match(/https?:\/\/[^/]+\/(.+)$/i);

    return cloudfrontMatch ? cloudfrontMatch[1] : null;
  }
}

/**
 * Convert S3 URL to CloudFront URL
 * @param {string} url - S3 URL
 * @returns {string} - CloudFront URL or original URL if conversion fails
 */
function convertUrlToCloudFrontUrl(url) {
  if (!url || url === 'NA' || url.trim() === '') {
    return url;
  }

  try {
    // If already a CloudFront URL, return as is
    if (CLOUDFRONT_DOMAIN && url.includes(CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '').split('/')[0])) {
      return url;
    }

    const key = extractS3KeyFromUrl(url);

    if (!key) {
      // If we can't extract key, return original URL
      return url;
    }

    return getCloudFrontUrl(key);
  } catch (error) {
    console.error('Error converting URL to CloudFront URL:', error);

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

  return getCloudFrontUrl(key);
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

  return getCloudFrontUrl(key);
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

  return getCloudFrontUrl(key);
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

  return getCloudFrontUrl(key);
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

  return getCloudFrontUrl(key);
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

  // URL Generators
  getS3Url,
  getCloudFrontUrl,
  convertUrlToCloudFrontUrl,
};
