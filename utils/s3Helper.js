const { convertUrlToCloudFrontUrl } = require('../config/aws');

/**
 * Convert image URL to CloudFront URL
 * @param {string} imageUrl - Image URL
 * @returns {string} - CloudFront URL
 */
function convertImageUrlToCloudFront(imageUrl) {
  if (!imageUrl || imageUrl === 'NA') {
    return imageUrl;
  }

  return convertUrlToCloudFrontUrl(imageUrl);
}

/**
 * Convert image fields in an object (recursively handles nested objects and arrays)
 * @param {Object} item - Object containing image URLs (may have nested objects/arrays)
 * @param {Array<string>} imageFields - Array of field names that contain image URLs (default: ['image', 'logo'])
 * @returns {Object} - Object with converted URLs
 */
function convertImageFieldsToCloudFront(item, imageFields = [ 'image', 'logo' ]) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  // Handle arrays - recursively convert each item
  if (Array.isArray(item)) {
    return item.map((element) => convertImageFieldsToCloudFront(element, imageFields));
  }

  // Create a copy to avoid mutating the original
  const converted = { ...item };

  // Convert image fields at current level
  imageFields.forEach((field) => {
    if (converted[field] && converted[field] !== 'NA' && typeof converted[field] === 'string') {
      converted[field] = convertImageUrlToCloudFront(converted[field]);
    }
  });

  // Recursively handle nested objects (excluding null, arrays, and primitives)
  Object.keys(converted).forEach((key) => {
    const value = converted[key];

    // Skip if it's an image field we already processed, null, or not an object/array
    if (
      imageFields.includes(key)
      || value === null
      || value === undefined
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
    ) {
      return;
    }

    // Recursively convert nested objects and arrays
    if (typeof value === 'object') {
      converted[key] = convertImageFieldsToCloudFront(value, imageFields);
    }
  });

  return converted;
}

/**
 * Convert image URLs in array of items to CloudFront URLs
 * @param {Array<Object>} items - Array of objects containing image URLs
 * @param {Array<string>} imageFields - Array of field names that contain image URLs
 * @returns {Array<Object>} - Array with converted URLs
 */
function convertArrayImageFieldsToCloudFront(items, imageFields = [ 'image', 'logo' ]) {
  if (!items || !Array.isArray(items)) {
    return items;
  }

  return convertImageFieldsToCloudFront(items, imageFields);
}

module.exports = {
  convertImageUrlToCloudFront,
  convertImageFieldsToCloudFront,
  convertArrayImageFieldsToCloudFront,
};
