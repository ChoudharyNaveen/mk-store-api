const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getNotification: getNotificationSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /get-notifications:
   *   post:
   *     summary: Get notifications with pagination
   *     tags: [Notifications, CLIENT]
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
   *                 description: Array of filter objects
   *               sorting:
   *                 type: array
   *                 items:
   *                   type: object
   *                 description: Array of sorting objects
   *               recipientId:
   *                 type: integer
   *                 description: Filter by recipient ID
   *               recipientType:
   *                 type: string
   *                 enum: [USER, VENDOR, BRANCH, ADMIN, ALL]
   *                 description: Filter by recipient type
   *               vendorId:
   *                 type: integer
   *                 description: Filter by vendor ID
   *               branchId:
   *                 type: integer
   *                 description: Filter by branch ID
   *     responses:
   *       200:
   *         description: Notifications retrieved successfully
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
   *                 pagination:
   *                   type: object
   */
  router.post('/get-notifications', isAuthenticated, validate(getNotificationSchema), getNotifications);

  /**
   * @swagger
   * /get-unread-notification-count:
   *   get:
   *     summary: Get unread notification count
   *     tags: [Notifications, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: vendorId
   *         schema:
   *           type: integer
   *         description: Filter by vendor ID
   *       - in: query
   *         name: branchId
   *         schema:
   *           type: integer
   *         description: Filter by branch ID
   *     responses:
   *       200:
   *         description: Unread count retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 count:
   *                   type: integer
   *                   example: 5
   */
  router.get('/get-unread-notification-count', isAuthenticated, getUnreadCount);

  /**
   * @swagger
   * /mark-notification-read/{notificationId}:
   *   patch:
   *     summary: Mark notification as read
   *     tags: [Notifications, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Notification ID
   *     responses:
   *       200:
   *         description: Notification marked as read
   *       404:
   *         description: Notification not found
   */
  router.patch('/mark-notification-read/:notificationId', isAuthenticated, markAsRead);

  /**
   * @swagger
   * /mark-all-notifications-read:
   *   patch:
   *     summary: Mark all notifications as read
   *     tags: [Notifications, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All notifications marked as read
   */
  router.patch('/mark-all-notifications-read', isAuthenticated, markAllAsRead);

  /**
   * @swagger
   * /delete-notification/{notificationId}:
   *   delete:
   *     summary: Delete notification
   *     tags: [Notifications, CLIENT]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Notification ID
   *     responses:
   *       200:
   *         description: Notification deleted successfully
   *       404:
   *         description: Notification not found
   */
  router.delete('/delete-notification/:notificationId', isAuthenticated, deleteNotification);
};
