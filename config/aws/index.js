// ============================================================================
// AWS CONFIGURATION - INDEX
// ============================================================================
// This file exports cloud provider functionality (SMS and S3)

const sms = require('../twilio');
const s3 = require('./s3');

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // SMS (Twilio)
  sendSMS: sms.sendSMS,
  twilioClient: sms.twilioClient,

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

  // URL Generators
  getS3Url: s3.getS3Url,
  getCloudFrontUrl: s3.getCloudFrontUrl,
  convertUrlToCloudFrontUrl: s3.convertUrlToCloudFrontUrl,
};
