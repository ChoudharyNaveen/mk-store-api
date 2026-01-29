const {
  placeOrder,
  getOrder,
  getStatsOfOrdersCompleted,
  updateOrder,
  getTotalReturnsOfToday,
  getOrderDetails,
} = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  placeOrder: placeOrderSchema,
  getOrder: getOrderSchema,
  updateOrder: updateOrderSchema,
  getOrderDetails: getOrderDetailsSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /place-order:
   *   post:
   *     summary: Place a new order from cart items
   *     tags: [Orders, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - vendorId
   *               - branchId
   *             properties:
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID (required)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID where order is placed (required - must belong to vendorId)
   *               createdBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is placing the order (optional, can be extracted from token)
   *               addressId:
   *                 type: integer
   *                 example: 1
   *                 description: Existing address ID (optional - if not provided, address fields must be provided)
   *               houseNo:
   *                 type: string
   *                 example: "123"
   *                 description: House number for new address (optional - required if addressId not provided)
   *               streetDetails:
   *                 type: string
   *                 example: "Main Street"
   *                 description: Street details for new address (optional - required if addressId not provided)
   *               landmark:
   *                 type: string
   *                 example: "Near Park"
   *                 description: Landmark for new address (optional - required if addressId not provided)
   *               name:
   *                 type: string
   *                 example: "John Doe"
   *                 description: Name for delivery address (optional - required if addressId not provided)
   *               mobileNumber:
   *                 type: string
   *                 example: "9876543210"
   *                 description: Mobile number for delivery address (optional - required if addressId not provided)
   *               offerCode:
   *                 type: string
   *                 example: "SUMMER20"
   *                 description: Offer code to apply discount (optional - cannot be used with promocodeId)
   *               promocodeId:
   *                 type: integer
   *                 example: 5
   *                 description: Promo code ID to apply discount (optional - cannot be used with offerCode)
   *               orderPriority:
   *                 type: string
   *                 enum: [NORMAL, EXPRESS, URGENT]
   *                 example: "NORMAL"
   *                 default: "NORMAL"
   *                 description: Order priority level (optional, defaults to NORMAL)
   *               estimatedDeliveryTime:
   *                 type: integer
   *                 example: 60
   *                 description: Estimated delivery time in minutes (optional)
   *               shippingCharges:
   *                 type: number
   *                 example: 50.00
   *                 default: 0
   *                 description: Shipping/delivery charges (optional, defaults to 0)
   *     responses:
   *       201:
   *         description: Order placed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Order placed successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     order_id:
   *                       type: integer
   *                       example: 1
   *                     order_number:
   *                       type: string
   *                       example: "ORD-20250115-000001"
   *                     total_amount:
   *                       type: number
   *                       example: 1500.00
   *                     discount_amount:
   *                       type: number
   *                       example: 150.00
   *                     shipping_charges:
   *                       type: number
   *                       example: 50.00
   *                     final_amount:
   *                       type: number
   *                       example: 1400.00
   *                     order_priority:
   *                       type: string
   *                       example: "NORMAL"
   *                     estimated_delivery_time:
   *                       type: integer
   *                       example: 60
   *                     item_count:
   *                       type: integer
   *                       example: 3
   *       400:
   *         description: Validation error or business logic error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Cannot apply both offer code and promo code. Please choose one."
   */
  router.post(
    '/place-order',
    isAuthenticated,
    validate(placeOrderSchema),
    placeOrder,
  );

  /**
   * @swagger
   * /get-order:
   *   post:
   *     summary: Get user orders with pagination, filters, and sorting
   *     tags: [Orders, CLIENT]
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
   *               filters:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     key:
   *                       type: string
   *                       example: "status"
   *                     eq:
   *                       type: string
   *                       example: "PENDING"
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
   *                       example: "created_at"
   *                     direction:
   *                       type: string
   *                       enum: [ASC, DESC]
   *                 description: Array of sorting objects
   *     responses:
   *       200:
   *         description: Orders retrieved successfully
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
   *                       id:
   *                         type: integer
   *                         example: 1
   *                       total_amount:
   *                         type: number
   *                       status:
   *                         type: string
   *                         enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED]
   *                       payment_status:
   *                         type: string
   *                         enum: [PAID, UNPAID, FAILED]
   *                       branch_id:
   *                         type: integer
   *                       address:
   *                         type: object
   *                       user:
   *                         type: object
   *                       orderDiscount:
   *                         type: object
   *                         nullable: true
   *                 count:
   *                   type: integer
   *                 pagination:
   *                   type: object
   */
  router.post('/get-order', isAuthenticated, validate(getOrderSchema), getOrder);

  /**
   * @swagger
   * /get-stats-of-orders-completed:
   *   get:
   *     summary: Get statistics of completed orders
   *     tags: [Orders, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Order statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       month:
   *                         type: string
   *                         example: "January"
   *                       totalAmount:
   *                         type: string
   *                         example: "15000.00"
   */
  router.get('/get-stats-of-orders-completed', isAuthenticated, getStatsOfOrdersCompleted);

  /**
   * @swagger
   * /update-order/{id}:
   *   patch:
   *     summary: Update order status and/or payment status
   *     tags: [Orders, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Order ID
   *       - in: header
   *         name: x-concurrencystamp
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Concurrency stamp for optimistic locking
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - updatedBy
   *               - concurrencyStamp
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED]
   *                 example: "CONFIRMED"
   *                 description: New order status (optional)
   *               paymentStatus:
   *                 type: string
   *                 enum: [PAID, UNPAID, FAILED]
   *                 example: "PAID"
   *                 description: New payment status (optional)
   *               orderPriority:
   *                 type: string
   *                 enum: [NORMAL, EXPRESS, URGENT]
   *                 example: "EXPRESS"
   *                 description: Order priority level (optional)
   *               estimatedDeliveryTime:
   *                 type: integer
   *                 example: 30
   *                 description: Estimated delivery time in minutes (optional)
   *               discountAmount:
   *                 type: number
   *                 example: 100.00
   *                 description: Discount amount (optional - will recalculate final_amount if updated)
   *               shippingCharges:
   *                 type: number
   *                 example: 50.00
   *                 description: Shipping/delivery charges (optional - will recalculate final_amount if updated)
   *               finalAmount:
   *                 type: number
   *                 example: 1450.00
   *                 description: Final amount after all adjustments (optional - if not provided, will be calculated)
   *               refundAmount:
   *                 type: number
   *                 example: 0.00
   *                 description: Refund amount (optional)
   *               refundStatus:
   *                 type: string
   *                 enum: [NONE, PENDING, PROCESSED, FAILED]
   *                 example: "NONE"
   *                 description: Refund status (optional)
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the order (required)
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *                 description: Concurrency stamp from previous response (required)
   *               notes:
   *                 type: string
   *                 example: "Order cancelled due to customer request"
   *                 description: Optional notes for status change (e.g., cancellation reason)
   *     responses:
   *       200:
   *         description: Order updated successfully
   *         headers:
   *           x-concurrencystamp:
   *             schema:
   *               type: string
   *           message:
   *             schema:
   *               type: string
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "successfully updated"
   *       400:
   *         description: Validation error
   *       409:
   *         description: Concurrency error
   */
  router.patch(
    '/update-order/:id',
    isAuthenticated,
    validate(updateOrderSchema),
    updateOrder,
  );

  /**
   * @swagger
   * /get-total-returns-of-today:
   *   get:
   *     summary: Get total returns for today
   *     tags: [Orders, ADMIN]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Returns count retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 total:
   *                   type: string
   *                   example: "5000.00"
   */
  router.get('/get-total-returns-of-today', isAuthenticated, getTotalReturnsOfToday);

  /**
   * @swagger
   * /get-order-details:
   *   post:
   *     summary: Get detailed order information including items, discounts, customer, and address
   *     tags: [Orders, BOTH]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - orderId
   *             properties:
   *               orderId:
   *                 type: integer
   *                 example: 1
   *                 description: Order ID to fetch details for
   *     responses:
   *       200:
   *         description: Order details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     order_id:
   *                       type: integer
   *                     order_number:
   *                       type: string
   *                     order_items:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                           product:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: integer
   *                               title:
   *                                 type: string
   *                               image:
   *                                 type: string
   *                           quantity:
   *                             type: integer
   *                           unit_price:
   *                             type: number
   *                           discount:
   *                             type: number
   *                           total:
   *                             type: number
   *                     summary:
   *                       type: object
   *                       properties:
   *                         subtotal:
   *                           type: number
   *                         discount:
   *                           type: number
   *                         shipping:
   *                           type: number
   *                         total:
   *                           type: number
   *                     applied_discounts:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           type:
   *                             type: string
   *                             enum: [promocode, offer]
   *                           code:
   *                             type: string
   *                           description:
   *                             type: string
   *                           discount_amount:
   *                             type: number
   *                           status:
   *                             type: string
   *                     customer_information:
   *                       type: object
   *                       properties:
   *                         name:
   *                           type: string
   *                         email:
   *                           type: string
   *                         mobile_number:
   *                           type: string
   *                     delivery_address:
   *                       type: object
   *                       properties:
   *                         recipient_name:
   *                           type: string
   *                         address_line_1:
   *                           type: string
   *                         address_line_2:
   *                           type: string
   *                         street_details:
   *                           type: string
   *                         landmark:
   *                           type: string
   *                         city:
   *                           type: string
   *                         state:
   *                           type: string
   *                         country:
   *                           type: string
   *                         postal_code:
   *                           type: string
   *                         mobile_number:
   *                           type: string
   *                     order_information:
   *                       type: object
   *                       properties:
   *                         order_date:
   *                           type: string
   *                           format: date-time
   *                         estimated_delivery:
   *                           type: string
   *                           format: date-time
   *                         priority:
   *                           type: string
   *                           enum: [NORMAL, EXPRESS, URGENT]
   *                         payment_status:
   *                           type: string
   *                           enum: [PAID, UNPAID, FAILED]
   *                         order_status:
   *                           type: string
   *       404:
   *         description: Order not found
   */
  router.post(
    '/get-order-details',
    isAuthenticated,
    validate(getOrderDetailsSchema),
    getOrderDetails,
  );
};
