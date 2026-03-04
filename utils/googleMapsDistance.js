const axios = require('axios');
const config = require('../config/index');

// Routes API (new) Distance Matrix endpoint
const ROUTES_DISTANCE_MATRIX_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

/**
 * Map legacy mode string to Routes API travelMode
 * @param {string} mode
 * @returns {'DRIVE'|'BICYCLE'|'WALK'|'TRANSIT'}
 */
const mapModeToTravelMode = (mode) => {
  switch ((mode || '').toLowerCase()) {
    case 'bicycling':
    case 'bicycle':
      return 'BICYCLE';
    case 'walking':
    case 'walk':
      return 'WALK';
    case 'transit':
      return 'TRANSIT';
    case 'driving':
    default:
      return 'DRIVE';
  }
};

/**
 * Parse Routes API duration string (e.g. "123s") to seconds
 * @param {string|null|undefined} duration
 * @returns {number|null}
 */
const parseDurationSeconds = (duration) => {
  if (!duration || typeof duration !== 'string') {
    return null;
  }

  const match = duration.match(/^(\d+)(?:\.\d+)?s$/);

  if (!match) {
    return null;
  }

  // eslint-disable-next-line radix
  return parseInt(match[1], 10);
};

/**
 * Get driving distance and duration between one origin and one destination using Routes API distance matrix
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Promise<{distance: number, eta: number, success: boolean, error?: string}>}
 *   distance in km, eta in minutes
 */
const getDistanceAndDuration = async (originLat, originLng, destLat, destLng) => {
  const googleMapsConfig = config.GOOGLE_MAPS || {};

  if (googleMapsConfig.enabled === false) {
    return { success: false, error: 'Google Maps distance API is disabled' };
  }

  const { apiKey } = googleMapsConfig;
  const timeout = googleMapsConfig.timeout || 5000;

  if (!apiKey) {
    return { success: false, error: 'Google Maps API key is not configured' };
  }

  try {
    const travelMode = mapModeToTravelMode(googleMapsConfig.mode || 'driving');

    const response = await axios.post(
      ROUTES_DISTANCE_MATRIX_URL,
      {
        origins: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: originLat,
                  longitude: originLng,
                },
              },
            },
          },
        ],
        destinations: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: destLat,
                  longitude: destLng,
                },
              },
            },
          },
        ],
        travelMode,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // Request only the fields we actually use
          'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,status',
        },
        timeout,
      },
    );

    const { data } = response;

    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: 'Google Routes API: empty response',
      };
    }

    const element = data[0];

    if (!element) {
      return {
        success: false,
        error: 'Google Routes API: invalid response element',
      };
    }

    if (element.status && element.status.code && element.status.code !== 0) {
      return {
        success: false,
        error: element.status.message || `Google Routes API error (code ${element.status.code})`,
      };
    }

    const { distanceMeters } = element;
    const durationSeconds = parseDurationSeconds(element.duration);

    if (distanceMeters == null) {
      return { success: false, error: 'Invalid response: missing distance' };
    }

    const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
    const etaMinutes = durationSeconds != null ? Math.round(durationSeconds / 60) : null;

    return {
      success: true,
      distance: distanceKm,
      eta: etaMinutes,
    };
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { success: false, error: 'Google Maps API request timeout' };
    }

    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error_message || `Google Maps API: ${error.response.status} ${error.response.statusText}`,
      };
    }

    return {
      success: false,
      error: error.message || 'Google Maps API error',
    };
  }
};

/**
 * Get driving distances and durations from one origin to multiple destinations (one API call)
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {Array<{lat: number, lng: number}>} destinations - Array of { lat, lng }
 * @returns {Promise<{results: Array<{distance: number, eta: number|null, status: string}>, success: boolean, error?: string}>}
 */
const getDistancesFromOrigin = async (originLat, originLng, destinations) => {
  const googleMapsConfig = config.GOOGLE_MAPS || {};

  if (googleMapsConfig.enabled === false) {
    return { success: false, error: 'Google Maps distance API is disabled' };
  }

  const { apiKey } = googleMapsConfig;
  const timeout = googleMapsConfig.timeout || 5000;

  if (!apiKey) {
    return { success: false, error: 'Google Maps API key is not configured' };
  }

  if (!destinations || destinations.length === 0) {
    return { success: true, results: [] };
  }

  try {
    const travelMode = mapModeToTravelMode(googleMapsConfig.mode || 'driving');

    const response = await axios.post(
      ROUTES_DISTANCE_MATRIX_URL,
      {
        origins: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: originLat,
                  longitude: originLng,
                },
              },
            },
          },
        ],
        destinations: destinations.map((d) => ({
          waypoint: {
            location: {
              latLng: {
                latitude: d.lat,
                longitude: d.lng,
              },
            },
          },
        })),
        travelMode,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,status',
        },
        timeout,
      },
    );

    const { data } = response;

    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: 'Google Routes API: empty response',
      };
    }

    const maxDestinationIndex = destinations.length - 1;

    // Initialize all results with default failure status
    const results = Array.from({ length: destinations.length }, () => ({
      distance: null,
      eta: null,
      status: 'UNKNOWN',
    }));

    data.forEach((element) => {
      const { originIndex, destinationIndex } = element;

      // We only support a single origin (index 0)
      if (originIndex !== 0 || destinationIndex == null || destinationIndex > maxDestinationIndex) {
        return;
      }

      if (element.status && element.status.code && element.status.code !== 0) {
        results[destinationIndex] = {
          distance: null,
          eta: null,
          status: element.status.message || `ERROR_CODE_${element.status.code}`,
        };

        return;
      }

      const { distanceMeters } = element;
      const durationSeconds = parseDurationSeconds(element.duration);
      const distanceKm = distanceMeters != null ? Math.round((distanceMeters / 1000) * 100) / 100 : null;
      const etaMinutes = durationSeconds != null ? Math.round(durationSeconds / 60) : null;

      results[destinationIndex] = {
        distance: distanceKm,
        eta: etaMinutes,
        status: distanceKm != null ? 'OK' : 'ZERO_RESULTS',
      };
    });

    return { success: true, results };
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { success: false, error: 'Google Maps API request timeout' };
    }

    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error_message || `Google Maps API: ${error.response.status} ${error.response.statusText}`,
      };
    }

    return {
      success: false,
      error: error.message || 'Google Maps API error',
    };
  }
};

module.exports = {
  getDistanceAndDuration,
  getDistancesFromOrigin,
};
