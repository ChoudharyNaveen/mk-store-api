const {
  checkServiceability,
  findNearbyBranches,
  calculateShippingCharges,
  saveBranchShippingConfig,
  getBranchShippingConfig,
} = require('../controllers/shippingController');
const { isAuthenticated, isVendorAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  checkServiceability: checkServiceabilitySchema,
  findNearbyBranches: findNearbyBranchesSchema,
  calculateShippingCharges: calculateShippingChargesSchema,
  saveBranchShippingConfig: saveBranchShippingConfigSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /check-serviceability:
   *   post:
   *     summary: Fast serviceability check using Haversine distance
   *     tags: [Shipping, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - branchId
   *               - latitude
   *               - longitude
   *             properties:
   *               branchId:
   *                 type: integer
   *                 example: 1
   *               latitude:
   *                 type: number
   *                 example: 12.9716
   *               longitude:
   *                 type: number
   *                 example: 77.5946
   *               maxDistance:
   *                 type: number
   *                 default: 10
   *                 description: Maximum serviceable distance in km
   *     responses:
   *       200:
   *         description: Serviceability check completed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 doc:
   *                   type: object
   *                   properties:
   *                     serviceable:
   *                       type: boolean
   *                     distance:
   *                       type: number
   *       400:
   *         description: Validation error
   */
  router.post(
    '/check-serviceability',
    isAuthenticated,
    validate(checkServiceabilitySchema),
    checkServiceability,
  );

  /**
   * @swagger
   * /find-nearby-branches:
   *   post:
   *     summary: Find nearby branches using Haversine distance
   *     tags: [Shipping, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - latitude
   *               - longitude
   *             properties:
   *               latitude:
   *                 type: number
   *                 example: 12.9716
   *               longitude:
   *                 type: number
   *                 example: 77.5946
   *               maxDistance:
   *                 type: number
   *                 default: 10
   *                 description: Maximum distance in km
   *               vendorId:
   *                 type: integer
   *                 description: Filter by vendor ID (optional)
   *     responses:
   *       200:
   *         description: Nearby branches found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 doc:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       branch:
   *                         type: object
   *                       distance:
   *                         type: number
   *       400:
   *         description: Validation error
   */
  router.post(
    '/find-nearby-branches',
    isAuthenticated,
    validate(findNearbyBranchesSchema),
    findNearbyBranches,
  );

  /**
   * @swagger
   * /calculate-shipping-charges:
   *   post:
   *     summary: Calculate shipping charges using road-distance API (cached) with Haversine fallback.
   *     description: Use this endpoint to show shipping charges to customers before they place an order.
   *     tags: [Shipping, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - branchId
   *               - orderAmount
   *             properties:
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID for shipping calculation
   *               addressId:
   *                 type: integer
   *                 example: 5
   *                 description: Optional - Saved address ID. If provided, latitude and longitude will be fetched from the address. Either addressId or (latitude and longitude) must be provided.
   *               latitude:
   *                 type: number
   *                 example: 12.9716
   *                 description: Optional - Address latitude. Required if addressId is not provided. Must be provided together with longitude.
   *               longitude:
   *                 type: number
   *                 example: 77.5946
   *                 description: Optional - Address longitude. Required if addressId is not provided. Must be provided together with latitude.
   *               orderAmount:
   *                 type: number
   *                 example: 250
   *                 description: Total order amount (used to determine if shipping is free based on thresholds)
   *               deliveryType:
   *                 type: string
   *                 enum: [SAME_DAY, NEXT_DAY]
   *                 default: NEXT_DAY
   *                 description: Delivery type - SAME_DAY for express/urgent orders, NEXT_DAY for normal orders
   *           examples:
   *             usingAddressId:
   *               summary: Using saved address
   *               value:
   *                 branchId: 1
   *                 addressId: 5
   *                 orderAmount: 250
   *                 deliveryType: NEXT_DAY
   *             usingCoordinates:
   *               summary: Using direct coordinates
   *               value:
   *                 branchId: 1
   *                 latitude: 12.9716
   *                 longitude: 77.5946
   *                 orderAmount: 250
   *                 deliveryType: NEXT_DAY
   *     responses:
   *       200:
   *         description: Shipping charges calculated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 doc:
   *                   type: object
   *                   properties:
   *                     shippingCharges:
   *                       type: number
   *                       example: 20
   *                       description: Calculated shipping charges in currency units
   *                     distance:
   *                       type: number
   *                       example: 2.5
   *                       description: Distance in kilometers
   *                     eta:
   *                       type: integer
   *                       nullable: true
   *                       example: 30
   *                       description: Estimated delivery time in minutes (from road-distance API, if available)
   *                     method:
   *                       type: string
   *                       enum: [ROAD_API, HAVERSINE_FALLBACK]
   *                       example: ROAD_API
   *                       description: Method used for distance calculation
   *       400:
   *         description: Validation error - Either addressId OR (latitude and longitude) must be provided
   *       404:
   *         description: Address not found or does not belong to the user
   */
  router.post(
    '/calculate-shipping-charges',
    isAuthenticated,
    validate(calculateShippingChargesSchema),
    calculateShippingCharges,
  );

  /**
   * @swagger
   * /save-branch-shipping-config:
   *   post:
   *     summary: Save or update branch shipping configuration (VENDOR_ADMIN only)
   *     tags: [Shipping, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - branchId
   *             properties:
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID (one config per branch)
   *               distanceThresholdKm:
   *                 type: number
   *                 default: 3.0
   *                 description: Configurable distance threshold in kilometers
   *               withinThresholdBaseCharge:
   *                 type: number
   *                 default: 20.0
   *                 description: Base shipping charge for orders within threshold distance
   *               withinThresholdFreeAbove:
   *                 type: number
   *                 default: 199.0
   *                 description: Order amount above which shipping is free within threshold distance
   *               aboveThresholdSamedayBaseCharge:
   *                 type: number
   *                 default: 120.0
   *                 description: Base shipping charge for same-day delivery above threshold distance
   *               aboveThresholdSamedayDiscountedCharge:
   *                 type: number
   *                 default: 50.0
   *                 description: Discounted shipping charge for same-day delivery above threshold
   *               aboveThresholdSamedayFreeAbove:
   *                 type: number
   *                 default: 399.0
   *                 description: Order amount above which same-day shipping is free above threshold distance
   *               aboveThresholdNextdayBaseCharge:
   *                 type: number
   *                 default: 50.0
   *                 description: Base shipping charge for next-day delivery above threshold distance
   *               aboveThresholdNextdayFreeAbove:
   *                 type: number
   *                 default: 399.0
   *                 description: Order amount above which next-day shipping is free above threshold distance
   *     responses:
   *       201:
   *         description: Branch shipping config saved successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/save-branch-shipping-config',
    isAuthenticated,
    isVendorAdmin,
    validate(saveBranchShippingConfigSchema),
    saveBranchShippingConfig,
  );

  /**
   * @swagger
   * /get-branch-shipping-config/{branchId}:
   *   get:
   *     summary: Get branch shipping configuration
   *     tags: [Shipping, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: branchId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Branch ID
   *     responses:
   *       200:
   *         description: Branch shipping config retrieved successfully
   *       404:
   *         description: Config not found (returns defaults)
   */
  router.get(
    '/get-branch-shipping-config/:branchId',
    isAuthenticated,
    getBranchShippingConfig,
  );
};
