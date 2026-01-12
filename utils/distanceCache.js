const {
  roadDistanceCache: RoadDistanceCacheModel,
  Sequelize: { Op },
} = require('../database');
const config = require('../config/index');

/**
 * Get cached road distance if available and not expired
 * @param {number} branchId - Branch ID
 * @param {number} lat - Address latitude
 * @param {number} lng - Address longitude
 * @returns {Promise<{distance: number, eta: number, method: string} | null>}
 */
const getCachedDistance = async (branchId, lat, lng) => {
  try {
    // Round coordinates to improve cache hit rate (to 4 decimal places ~11 meters precision)
    const roundedLat = Math.round(parseFloat(lat) * 10000) / 10000;
    const roundedLng = Math.round(parseFloat(lng) * 10000) / 10000;

    const cacheEntry = await RoadDistanceCacheModel.findOne({
      where: {
        branch_id: branchId,
        address_latitude: roundedLat,
        address_longitude: roundedLng,
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
      attributes: [ 'distance', 'eta', 'distance_method' ],
      order: [ [ 'created_at', 'DESC' ] ],
    });

    if (cacheEntry) {
      return {
        distance: parseFloat(cacheEntry.distance),
        eta: cacheEntry.eta ? parseInt(cacheEntry.eta) : null,
        method: cacheEntry.distance_method,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting cached distance:', error);

    return null;
  }
};

/**
 * Cache road distance result
 * @param {number} branchId - Branch ID
 * @param {number} lat - Address latitude
 * @param {number} lng - Address longitude
 * @param {number} distance - Distance in kilometers
 * @param {number} eta - Estimated delivery time in minutes (optional)
 * @param {string} method - Distance method ('ROAD_API' or 'HAVERSINE_FALLBACK')
 * @param {number} ttl - Time to live in seconds (optional, defaults to config)
 * @returns {Promise<void>}
 */
const setCachedDistance = async (branchId, lat, lng, distance, eta, method = 'ROAD_API', ttl = null) => {
  try {
    const cacheConfig = config.ROAD_DISTANCE_API?.cache || {};
    const cacheTTL = ttl || cacheConfig.ttl || 86400; // Default: 24 hours

    // Round coordinates to improve cache hit rate
    const roundedLat = Math.round(parseFloat(lat) * 10000) / 10000;
    const roundedLng = Math.round(parseFloat(lng) * 10000) / 10000;

    const expiresAt = new Date();

    expiresAt.setSeconds(expiresAt.getSeconds() + cacheTTL);

    // Use upsert to update existing entry or create new one
    await RoadDistanceCacheModel.upsert({
      branch_id: branchId,
      address_latitude: roundedLat,
      address_longitude: roundedLng,
      distance: parseFloat(distance),
      eta: eta ? parseInt(eta) : null,
      distance_method: method,
      expires_at: expiresAt,
      created_at: new Date(),
    });
  } catch (error) {
    console.error('Error caching distance:', error);

    // Don't throw error - caching is not critical
  }
};

/**
 * Clean up expired cache entries (can be called by a cron job)
 * @returns {Promise<number>} Number of deleted entries
 */
const cleanupExpiredCache = async () => {
  try {
    const result = await RoadDistanceCacheModel.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date(),
        },
      },
    });

    console.log(`Cleaned up ${result} expired distance cache entries`);

    return result;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);

    return 0;
  }
};

module.exports = {
  getCachedDistance,
  setCachedDistance,
  cleanupExpiredCache,
};
