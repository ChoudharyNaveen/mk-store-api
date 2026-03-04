// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate Haversine distance between two coordinates (straight-line)
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos((lat1 * Math.PI) / 180)
    * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLng / 2)
    * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
};

/**
 * Buffered Haversine distance (approximates road distance when API unavailable)
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

module.exports = {
  calculateHaversineDistance,
  calculateBufferedHaversine,
};
