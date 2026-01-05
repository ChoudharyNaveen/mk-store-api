// ============================================================================
// AWS CONFIGURATION - INDEX
// ============================================================================
// This file exports all AWS-related functionality (SNS and S3)

const sns = require('./sns');
const s3 = require('./s3');

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // SNS
  sendSMS: sns.sendSMS,
  snsClient: sns.snsClient,

  // S3 Clients
  s3Client: s3.s3Client,

  // S3 Upload - Vendor files
  uploadFile: s3.uploadFile,
  uploadBuffer: s3.uploadBuffer,

  // S3 Upload - User files
  uploadUserFile: s3.uploadUserFile,
  uploadUserBuffer: s3.uploadUserBuffer,

  // S3 Upload - Video
  uploadVideo: s3.uploadVideo,

  // S3 Pre-signed URLs
  getPreSignedUrl: s3.getPreSignedUrl,
  getVendorPreSignedUrl: s3.getVendorPreSignedUrl,
  getUserPreSignedUrl: s3.getUserPreSignedUrl,
  convertUrlToPreSignedUrl: s3.convertUrlToPreSignedUrl,

  // S3 URL Generators
  getS3Url: s3.getS3Url,
};
