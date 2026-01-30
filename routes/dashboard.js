const {
  getDashboardKPIs,
  getTopProducts,
  getRecentOrders,
  getExpiringProducts,
} = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getExpiringProducts: getExpiringProductsSchema,
  getDashboardKPIs: getDashboardKPIsSchema,
  getRecentOrders: getRecentOrdersSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /get-dashboard-kpis:
   *   post:
   *     summary: Get dashboard KPIs (Total Users, Orders, Revenue, Returns) with trends
   *     tags: [Dashboard, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Filter by vendor ID (optional)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Filter by branch ID (optional)
   *     responses:
   *       200:
   *         description: Dashboard KPIs retrieved successfully
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
   *                     total_users:
   *                       type: object
   *                       properties:
   *                         value:
   *                           type: integer
   *                           example: 40689
   *                         change:
   *                           type: number
   *                           example: 8.5
   *                         change_type:
   *                           type: string
   *                           enum: [up, down]
   *                         period:
   *                           type: string
   *                           example: "yesterday"
   *                     total_orders:
   *                       type: object
   *                     revenue:
   *                       type: object
   *                     total_returns:
   *                       type: object
   */
  router.post('/get-dashboard-kpis', isAuthenticated, validate(getDashboardKPIsSchema), getDashboardKPIs);

  /**
   * @swagger
   * /get-top-products:
   *   post:
   *     summary: Get top products with revenue, orders, and trend
   *     tags: [Dashboard, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               vendorId:
   *                 type: integer
   *               branchId:
   *                 type: integer
   *               limit:
   *                 type: integer
   *                 default: 5
   *                 example: 5
   *               startDate:
   *                 type: string
   *                 format: date
   *                 example: "2025-12-01"
   *                 description: Start date for filtering (optional, ISO format)
   *               endDate:
   *                 type: string
   *                 format: date
   *                 example: "2026-01-31"
   *                 description: End date for filtering (optional, ISO format)
   *     responses:
   *       200:
   *         description: Top products retrieved successfully
   */
  router.post('/get-top-products', isAuthenticated, getTopProducts);

  /**
   * @swagger
   * /get-recent-orders:
   *   post:
   *     summary: Get recent orders with status, customer, time, price
   *     tags: [Dashboard, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               vendorId:
   *                 type: integer
   *               branchId:
   *                 type: integer
   *               limit:
   *                 type: integer
   *                 default: 5
   *                 example: 5
   *               startDate:
   *                 type: string
   *                 format: date
   *                 example: "2025-12-01"
   *                 description: Start date for filtering (optional, ISO format)
   *               endDate:
   *                 type: string
   *                 format: date
   *                 example: "2026-01-31"
   *                 description: End date for filtering (optional, ISO format)
   *     responses:
   *       200:
   *         description: Recent orders retrieved successfully
   */
  router.post('/get-recent-orders', isAuthenticated, validate(getRecentOrdersSchema), getRecentOrders);

  /**
   * @swagger
   * /get-expiring-products:
   *   post:
   *     summary: Get expiring products/variants with pagination
   *     tags: [Dashboard, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               pageSize:
   *                 type: integer
   *                 enum: [1, 5, 10, 20, 30, 40, 50, 100, 500]
   *                 default: 10
   *                 description: Number of results per page
   *               pageNumber:
   *                 type: integer
   *                 minimum: 1
   *                 default: 1
   *                 description: Page number
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Filter by vendor ID (optional)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Filter by branch ID (optional)
   *               daysAhead:
   *                 type: integer
   *                 minimum: 1
   *                 default: 30
   *                 example: 30
   *                 description: "Number of days ahead to check for expiring products (default: 30)"
   *               filters:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     key:
   *                       type: string
   *                     eq:
   *                       type: string
   *                     in:
   *                       type: array
   *                       items:
   *                         type: string
   *                     neq:
   *                       type: string
   *                     gt:
   *                       type: string
   *                     gte:
   *                       type: string
   *                     lt:
   *                       type: string
   *                     lte:
   *                       type: string
   *                     like:
   *                       type: string
   *                     iLike:
   *                       type: string
   *                 description: Array of filter objects
   *               sorting:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     key:
   *                       type: string
   *                     direction:
   *                       type: string
   *                       enum: [ASC, DESC]
   *                 description: Array of sorting objects
   *     responses:
   *       200:
   *         description: Expiring products retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 doc:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       variant_id:
   *                         type: integer
   *                         example: 1
   *                       variant_name:
   *                         type: string
   *                         example: "200g"
   *                       product_id:
   *                         type: integer
   *                         example: 10
   *                       product_name:
   *                         type: string
   *                         example: "Cheese"
   *                       category_id:
   *                         type: integer
   *                         example: 1
   *                       category_name:
   *                         type: string
   *                         example: "Dairy"
   *                       stock:
   *                         type: integer
   *                         example: 8
   *                       price:
   *                         type: number
   *                         example: 120
   *                       expiry_date:
   *                         type: string
   *                         format: date-time
   *                       expiry_date_formatted:
   *                         type: string
   *                         example: "Jan 17, 2026"
   *                       expiry_status:
   *                         type: string
   *                         example: "Expired 2 days ago"
   *                       expiry_status_type:
   *                         type: string
   *                         enum: [expired, expiring_today, expiring_soon]
   *                         example: "expired"
   *                       days_until_expiry:
   *                         type: integer
   *                         example: -2
   *                         description: Negative for expired, 0 for today, positive for future
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     pageSize:
   *                       type: integer
   *                     pageNumber:
   *                       type: integer
   *                     totalCount:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   */
  router.post('/get-expiring-products', isAuthenticated, validate(getExpiringProductsSchema), getExpiringProducts);
};
