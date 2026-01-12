const axios = require('axios');
const config = require('../config/index');

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate Haversine distance between two coordinates
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
  // Convert degrees to radians
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos((lat1 * Math.PI) / 180)
    * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLng / 2)
    * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in kilometers
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate buffered Haversine distance for fallback
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @param {number} bufferFactor - Buffer factor (default: 1.3)
 * @returns {number} Buffered distance in kilometers
 */
const calculateBufferedHaversine = (lat1, lng1, lat2, lng2, bufferFactor = 1.3) => {
  const haversineDistance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

  return Math.round(haversineDistance * bufferFactor * 100) / 100;
};

/**
 * Get road distance from external API
 * @param {number} branchId - Branch ID
 * @param {number} branchLat - Branch latitude
 * @param {number} branchLng - Branch longitude
 * @param {number} addressLat - Address latitude
 * @param {number} addressLng - Address longitude
 * @returns {Promise<{distance: number, eta: number, success: boolean, error?: string}>}
 */
const getRoadDistance = async (branchId, branchLat, branchLng, addressLat, addressLng) => {
  const roadDistanceApiConfig = config.ROAD_DISTANCE_API || {};

  // If road-distance API is disabled, return failure
  if (roadDistanceApiConfig.enabled === false) {
    return {
      success: false,
      error: 'Road-distance API is disabled',
    };
  }

  const apiUrl = roadDistanceApiConfig.url;
  const { apiKey } = roadDistanceApiConfig;
  const timeout = roadDistanceApiConfig.timeout || 5000;

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: 'Road-distance API configuration is missing',
    };
  }

  try {
    // Call road-distance API
    // Note: Adjust the request format based on your actual API provider
    // This is a generic example - you'll need to adapt it to your API's requirements
    const response = await axios.post(
      apiUrl,
      {
        origin: {
          latitude: branchLat,
          longitude: branchLng,
        },
        destination: {
          latitude: addressLat,
          longitude: addressLng,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout,
      },
    );

    // Parse response based on your API's response format
    // Adjust these fields based on your actual API response structure
    const distance = response.data?.distance || response.data?.distance_km || null;
    const eta = response.data?.eta || response.data?.estimated_time_minutes || null;

    if (distance === null || distance === undefined) {
      return {
        success: false,
        error: 'Invalid response from road-distance API',
      };
    }

    return {
      success: true,
      distance: parseFloat(distance),
      eta: eta ? parseInt(eta) : null,
    };
  } catch (error) {
    // Handle API errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Road-distance API request timeout',
      };
    }

    if (error.response) {
      // API returned an error response
      return {
        success: false,
        error: `Road-distance API error: ${error.response.status} ${error.response.statusText}`,
      };
    }

    // Network or other errors
    return {
      success: false,
      error: `Road-distance API error: ${error.message}`,
    };
  }
};

module.exports = {
  calculateHaversineDistance,
  calculateBufferedHaversine,
  getRoadDistance,
};
