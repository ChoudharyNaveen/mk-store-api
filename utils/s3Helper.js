const { convertUrlToPreSignedUrl } = require('../config/aws');

/**
 * Convert image URL to pre-signed URL
 * @param {string} imageUrl - Image URL
 * @returns {Promise<string>} - Pre-signed URL
 */
async function convertImageUrlToPreSigned(imageUrl) {
  if (!imageUrl || imageUrl === 'NA') {
    return imageUrl;
  }

  return convertUrlToPreSignedUrl(imageUrl);
}

/**
 * Convert image fields in an object (recursively handles nested objects and arrays)
 * @param {Object} item - Object containing image URLs (may have nested objects/arrays)
 * @param {Array<string>} imageFields - Array of field names that contain image URLs (default: ['image', 'logo'])
 * @returns {Promise<Object>} - Object with converted URLs
 */
async function convertImageFieldsToPreSigned(item, imageFields = [ 'image', 'logo' ]) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  // Handle arrays - recursively convert each item
  if (Array.isArray(item)) {
    return Promise.all(
      item.map((element) => convertImageFieldsToPreSigned(element, imageFields)),
    );
  }

  // Create a copy to avoid mutating the original
  const converted = { ...item };

  // Convert image fields at current level
  await Promise.all(
    imageFields.map(async (field) => {
      if (converted[field] && converted[field] !== 'NA' && typeof converted[field] === 'string') {
        converted[field] = await convertImageUrlToPreSigned(converted[field]);
      }
    }),
  );

  // Recursively handle nested objects (excluding null, arrays, and primitives)
  await Promise.all(
    Object.keys(converted).map(async (key) => {
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
        converted[key] = await convertImageFieldsToPreSigned(value, imageFields);
      }
    }),
  );

  return converted;
}

/**
 * Convert image URLs in array of items to pre-signed URLs
 * @param {Array<Object>} items - Array of objects containing image URLs
 * @param {Array<string>} imageFields - Array of field names that contain image URLs
 * @returns {Promise<Array<Object>>} - Array with converted URLs
 */
async function convertArrayImageFieldsToPreSigned(items, imageFields = [ 'image', 'logo' ]) {
  if (!items || !Array.isArray(items)) {
    return items;
  }

  return convertImageFieldsToPreSigned(items, imageFields);
}

module.exports = {
  convertImageUrlToPreSigned,
  convertImageFieldsToPreSigned,
  convertArrayImageFieldsToPreSigned,
};
