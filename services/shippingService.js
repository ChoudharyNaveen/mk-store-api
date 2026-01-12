/* eslint-disable max-lines */
const { v4: uuidV4 } = require('uuid');
const {
  branchShippingConfig: BranchShippingConfigModel,
  branch: BranchModel,
  sequelize,
  Sequelize: { Op },
} = require('../database');
const {
  convertCamelToSnake,
  convertSnakeToCamel,
} = require('../utils/helper');
const {
  calculateHaversineDistance,
  calculateBufferedHaversine,
  getRoadDistance,
} = require('../utils/distanceHelper');
const { getCachedDistance, setCachedDistance } = require('../utils/distanceCache');
const config = require('../config/index');
const {
  NotFoundError,
  ValidationError,
  handleServiceError,
} = require('../utils/serviceErrors');

/**
 * Fast serviceability check using Haversine distance
 * @param {number} branchId - Branch ID
 * @param {number} addressLat - Address latitude
 * @param {number} addressLng - Address longitude
 * @param {number} maxDistance - Maximum serviceable distance in km (optional, default: 10)
 * @returns {Promise<{serviceable: boolean, distance: number}>}
 */
const checkServiceability = async (branchId, addressLat, addressLng, maxDistance = 10) => {
  try {
    const branch = await BranchModel.findOne({
      where: { id: branchId },
      attributes: [ 'id', 'latitude', 'longitude' ],
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (!branch.latitude || !branch.longitude) {
      throw new ValidationError('Branch coordinates are not set');
    }

    if (!addressLat || !addressLng) {
      throw new ValidationError('Address coordinates are required');
    }

    const distance = calculateHaversineDistance(
      branch.latitude,
      branch.longitude,
      addressLat,
      addressLng,
    );

    return {
      serviceable: distance <= maxDistance,
      distance: Math.round(distance * 100) / 100,
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to check serviceability');
  }
};

/**
 * Find nearby branches using Haversine distance
 * @param {number} addressLat - Address latitude
 * @param {number} addressLng - Address longitude
 * @param {number} maxDistance - Maximum distance in km (optional, default: 10)
 * @param {number} vendorId - Vendor ID to filter branches (optional)
 * @returns {Promise<Array<{branch: object, distance: number}>>}
 */
const findNearbyBranches = async (addressLat, addressLng, maxDistance = 10, vendorId = null) => {
  try {
    if (!addressLat || !addressLng) {
      throw new ValidationError('Address coordinates are required');
    }

    const where = {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
      status: 'ACTIVE',
    };

    if (vendorId) {
      where.vendor_id = vendorId;
    }

    const branches = await BranchModel.findAll({
      where,
      attributes: [ 'id', 'name', 'latitude', 'longitude', 'vendor_id', 'city', 'state' ],
    });

    // Calculate distance for each branch and filter by maxDistance
    const nearbyBranches = branches
      .map((branch) => {
        const distance = calculateHaversineDistance(
          branch.latitude,
          branch.longitude,
          addressLat,
          addressLng,
        );

        return {
          branch: convertSnakeToCamel(branch.dataValues),
          distance: Math.round(distance * 100) / 100,
        };
      })
      .filter((item) => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return { doc: nearbyBranches };
  } catch (error) {
    return handleServiceError(error, 'Failed to find nearby branches');
  }
};

/**
 * Calculate shipping charges based on distance, order amount, and delivery type
 * @param {number} branchId - Branch ID
 * @param {number} addressLat - Address latitude
 * @param {number} addressLng - Address longitude
 * @param {number} orderAmount - Order amount
 * @param {string} deliveryType - Delivery type ('SAME_DAY' or 'NEXT_DAY')
 * @returns {Promise<{shippingCharges: number, distance: number, eta: number, method: string}>}
 */
const calculateShippingCharges = async (branchId, addressLat, addressLng, orderAmount, deliveryType = 'NEXT_DAY') => {
  try {
    // Get branch coordinates and shipping config
    const branch = await BranchModel.findOne({
      where: { id: branchId },
      attributes: [ 'id', 'latitude', 'longitude', 'vendor_id' ],
      include: [
        {
          model: BranchShippingConfigModel,
          as: 'shippingConfig',
          attributes: [
            'distance_threshold_km',
            'within_threshold_base_charge',
            'within_threshold_free_above',
            'above_threshold_sameday_base_charge',
            'above_threshold_sameday_discounted_charge',
            'above_threshold_sameday_free_above',
            'above_threshold_nextday_base_charge',
            'above_threshold_nextday_free_above',
            'status',
          ],
          required: false,
        },
      ],
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (!branch.latitude || !branch.longitude) {
      throw new ValidationError('Branch coordinates are not set');
    }

    if (!addressLat || !addressLng) {
      throw new ValidationError('Address coordinates are required');
    }

    // Get shipping config or use defaults (all configurable)
    const shippingConfig = branch.shippingConfig || {
      distance_threshold_km: 3.0,
      within_threshold_base_charge: 20.0,
      within_threshold_free_above: 199.0,
      above_threshold_sameday_base_charge: 120.0,
      above_threshold_sameday_discounted_charge: 50.0,
      above_threshold_sameday_free_above: 399.0,
      above_threshold_nextday_base_charge: 50.0,
      above_threshold_nextday_free_above: 399.0,
    };

    // Get configurable distance threshold (default: 3.0 km if not configured)
    const distanceThreshold = shippingConfig.distance_threshold_km !== undefined && shippingConfig.distance_threshold_km !== null
      ? parseFloat(shippingConfig.distance_threshold_km)
      : 3.0;

    // Try to get cached road distance first
    let distance = null;
    let eta = null;
    let method = 'HAVERSINE_FALLBACK';

    const cachedResult = await getCachedDistance(branchId, addressLat, addressLng);

    if (cachedResult) {
      // Use cached result
      distance = cachedResult.distance;
      eta = cachedResult.eta;
      method = cachedResult.method;
    } else {
      // Try road-distance API (if enabled)
      const roadDistanceApiConfig = config.ROAD_DISTANCE_API || {};

      if (roadDistanceApiConfig.enabled !== false) {
        const roadResult = await getRoadDistance(
          branchId,
          branch.latitude,
          branch.longitude,
          addressLat,
          addressLng,
        );

        if (roadResult.success) {
          // Use road distance from API
          distance = roadResult.distance;
          eta = roadResult.eta;
          method = 'ROAD_API';

          // Cache the result
          await setCachedDistance(branchId, addressLat, addressLng, distance, eta, method);
        } else {
          // API failed, use buffered Haversine fallback
          const bufferFactor = roadDistanceApiConfig.fallback?.haversineBuffer || 1.3;

          distance = calculateBufferedHaversine(
            branch.latitude,
            branch.longitude,
            addressLat,
            addressLng,
            bufferFactor,
          );
          method = 'HAVERSINE_FALLBACK';

          // Cache the fallback result with shorter TTL (maybe 1 hour)
          await setCachedDistance(branchId, addressLat, addressLng, distance, null, method, 3600);
        }
      } else {
        // Road-distance API disabled, use buffered Haversine
        const bufferFactor = roadDistanceApiConfig.fallback?.haversineBuffer || 1.3;

        distance = calculateBufferedHaversine(
          branch.latitude,
          branch.longitude,
          addressLat,
          addressLng,
          bufferFactor,
        );
        method = 'HAVERSINE_FALLBACK';
      }
    }

    // Calculate shipping charges based on distance and order amount
    let shippingCharges = 0;

    // Round distance to 2 decimal places
    distance = Math.round(distance * 100) / 100;

    // Apply shipping rules using configurable distance threshold
    // < threshold = within threshold, >= threshold = above threshold
    if (distance < distanceThreshold) {
      // Within threshold distance (all configurable)
      if (orderAmount >= shippingConfig.within_threshold_free_above) {
        shippingCharges = 0; // Free delivery
      } else {
        shippingCharges = shippingConfig.within_threshold_base_charge;
      }
    } else if (deliveryType === 'SAME_DAY') {
      // Above threshold distance - SAME_DAY (exactly at threshold = above threshold category, all configurable)
      if (orderAmount >= shippingConfig.above_threshold_sameday_free_above) {
        shippingCharges = 0; // Free delivery
      } else if (orderAmount >= shippingConfig.above_threshold_sameday_free_above * 0.7) {
        // Discounted charge (example: if order is 70% of free threshold)
        shippingCharges = shippingConfig.above_threshold_sameday_discounted_charge;
      } else {
        shippingCharges = shippingConfig.above_threshold_sameday_base_charge;
      }
    } else if (orderAmount >= shippingConfig.above_threshold_nextday_free_above) {
      // Above threshold distance - NEXT_DAY (exactly at threshold = above threshold category, all configurable)
      shippingCharges = 0; // Free delivery
    } else {
      shippingCharges = shippingConfig.above_threshold_nextday_base_charge;
    }

    return {
      doc: {
        shippingCharges: Math.round(shippingCharges * 100) / 100,
        distance,
        eta,
        method,
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to calculate shipping charges');
  }
};

/**
 * Save or update branch shipping configuration (VENDOR_ADMIN only)
 * @param {Object} data - Shipping config data
 * @returns {Promise<{doc: object}>}
 */
const saveBranchShippingConfig = async ({ data }) => {
  let transaction = null;

  try {
    const {
      createdBy, branchId, ...datas
    } = data;

    transaction = await sequelize.transaction();

    // Verify branch exists
    const branch = await BranchModel.findOne({
      where: { id: branchId },
      attributes: [ 'id' ],
      transaction,
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Check if config already exists
    const existingConfig = await BranchShippingConfigModel.findOne({
      where: { branch_id: branchId },
      transaction,
    });

    const concurrencyStamp = uuidV4();

    if (existingConfig) {
      // Update existing config
      await BranchShippingConfigModel.update(
        convertCamelToSnake({
          ...datas,
          updatedBy: createdBy,
          concurrencyStamp,
        }),
        {
          where: { branch_id: branchId },
          transaction,
        },
      );
    } else {
      // Create new config
      await BranchShippingConfigModel.create(
        convertCamelToSnake({
          ...datas,
          branchId,
          concurrencyStamp,
          createdBy,
        }),
        {
          transaction,
        },
      );
    }

    const updated = await BranchShippingConfigModel.findOne({
      where: { branch_id: branchId },
      transaction,
    });

    await transaction.commit();

    const configData = convertSnakeToCamel(updated.dataValues);

    return { doc: configData };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to save branch shipping config');
  }
};

/**
 * Get branch shipping configuration
 * @param {number} branchId - Branch ID
 * @returns {Promise<{doc: object}>}
 */
const getBranchShippingConfig = async (branchId) => {
  try {
    const shippingConfig = await BranchShippingConfigModel.findOne({
      where: { branch_id: branchId, status: 'ACTIVE' },
      include: [
        {
          model: BranchModel,
          as: 'branch',
          attributes: [ 'id', 'name', 'vendor_id' ],
        },
      ],
    });

    if (!shippingConfig) {
      // Return default config if not found (all configurable)
      return {
        doc: {
          branch_id: branchId,
          distance_threshold_km: 3.0,
          within_threshold_base_charge: 20.0,
          within_threshold_free_above: 199.0,
          above_threshold_sameday_base_charge: 120.0,
          above_threshold_sameday_discounted_charge: 50.0,
          above_threshold_sameday_free_above: 399.0,
          above_threshold_nextday_base_charge: 50.0,
          above_threshold_nextday_free_above: 399.0,
          status: 'ACTIVE',
        },
      };
    }

    const configData = convertSnakeToCamel(shippingConfig.dataValues);

    return { doc: configData };
  } catch (error) {
    return handleServiceError(error, 'Failed to get branch shipping config');
  }
};

module.exports = {
  checkServiceability,
  findNearbyBranches,
  calculateShippingCharges,
  saveBranchShippingConfig,
  getBranchShippingConfig,
};
