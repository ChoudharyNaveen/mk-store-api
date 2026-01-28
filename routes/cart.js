const {
  saveCart,
  getCart,
  deleteCart,
  updateCart,
} = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  saveCart: saveCartSchema,
  getCart: getCartSchema,
  deleteCart: deleteCartSchema,
  updateCart: updateCartSchema,
} = require('../schemas');

module.exports = (router) => {
  /**
   * @swagger
   * /add-to-cart:
   *   post:
   *     summary: Add item to cart
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - productId
   *               - variantId
   *               - quantity
   *               - price
   *             properties:
   *               productId:
   *                 type: integer
   *                 example: 1
   *                 description: Product ID (required - must match variant's product)
   *               variantId:
   *                 type: integer
   *                 example: 1
   *                 description: Product variant ID (required - must belong to the specified product)
   *               quantity:
   *                 type: integer
   *                 minimum: 1
   *                 example: 2
   *                 description: Quantity to add to cart (required)
   *               comboId:
   *                 type: integer
   *                 example: 10
   *                 description: "Combo discount ID (optional - if provided, price is calculated automatically as combo price for one combo set, quantity can be any value ≥ 1)"
   *               vendorId:
   *                 type: integer
   *                 example: 1
   *                 description: Vendor ID (optional - will be validated against product's vendor)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Branch ID (optional - will be validated against product's branch)
   *           examples:
   *             regularItem:
   *               summary: Add regular item to cart
   *               description: "Example: 2 items at ₹120 each, price calculated automatically as ₹240"
   *               value:
   *                 productId: 1
   *                 variantId: 5
   *                 quantity: 2
   *             comboItemPERCENT:
   *               summary: Add combo item with PERCENT discount
   *               description: "Example: combo_quantity=3, sellingPrice=₹120, 10% discount. Price calculated automatically as ₹324. Quantity can be 1, 2, 3, etc."
   *               value:
   *                 productId: 1
   *                 variantId: 5
   *                 quantity: 1
   *                 comboId: 10
   *             comboItemFLATOFF:
   *               summary: Add combo item with FLATOFF discount
   *               description: "Example: combo_quantity=3, sellingPrice=₹120, FLATOFF ₹20. Price calculated automatically as ₹340. Quantity can be 1, 2, 3, etc."
   *               value:
   *                 productId: 1
   *                 variantId: 5
   *                 quantity: 1
   *                 comboId: 10
   *             withVendorBranch:
   *               summary: Add item with vendor and branch validation
   *               description: "Example: 1 item at ₹120, price calculated automatically as ₹120"
   *               value:
   *                 productId: 1
   *                 variantId: 5
   *                 quantity: 1
   *                 vendorId: 1
   *                 branchId: 2
   *     responses:
   *       200:
   *         description: Item added to cart successfully or item already exists in cart
   *         content:
   *           application/json:
   *             schema:
   *               oneOf:
   *                 - type: object
   *                   properties:
   *                     success:
   *                       type: boolean
   *                       example: true
   *                     message:
   *                       type: string
   *                       example: "item already added to cart"
   *                 - type: object
   *                   properties:
   *                     success:
   *                       type: boolean
   *                       example: true
   *                     message:
   *                       type: string
   *                       example: "successfully added"
   *                     doc:
   *                       type: object
   *                       properties:
   *                         cat:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: integer
   *                               example: 1
   *                             product_id:
   *                               type: integer
   *                               example: 1
   *                             variant_id:
   *                               type: integer
   *                               example: 1
   *                             vendor_id:
   *                               type: integer
   *                               example: 1
   *                             branch_id:
   *                               type: integer
   *                               example: 1
   *                             quantity:
   *                               type: integer
   *                               example: 2
   *                             combo_id:
   *                               type: integer
   *                               nullable: true
   *                               example: null
   *                             unit_price:
   *                               type: number
   *                               example: 120
   *                             total_price:
   *                               type: number
   *                               example: 240
   *                             status:
   *                               type: string
   *                               example: "ACTIVE"
   *                             created_at:
   *                               type: string
   *                               format: date-time
   *                               example: "2025-01-25T10:30:00.000Z"
   *                             updated_at:
   *                               type: string
   *                               format: date-time
   *                               example: "2025-01-25T10:30:00.000Z"
   *                             concurrency_stamp:
   *                               type: string
   *                               format: uuid
   *                               example: "550e8400-e29b-41d4-a716-446655440000"
   *             examples:
   *               success:
   *                 summary: Item added successfully
   *                 value:
   *                   success: true
   *                   message: "successfully added"
   *                   doc:
   *                     cat:
   *                       id: 15
   *                       product_id: 1
   *                       variant_id: 5
   *                       vendor_id: 1
   *                       branch_id: 2
   *                       quantity: 2
   *                       is_combo: false
   *                       unit_price: 120
   *                       total_price: 240
   *                       status: "ACTIVE"
   *                       created_at: "2025-01-25T10:30:00.000Z"
   *                       updated_at: "2025-01-25T10:30:00.000Z"
   *                       concurrency_stamp: "550e8400-e29b-41d4-a716-446655440000"
   *               alreadyExists:
   *                 summary: Item already in cart
   *                 value:
   *                   success: true
   *                   message: "item already added to cart"
   *       400:
   *         description: Validation error (product/variant not found, price mismatch, combo validation failed, etc.)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 errors:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Price must be ₹240 for regular pricing (2 × ₹120)"
   *             examples:
   *               priceMismatch:
   *                 summary: Price validation error
   *                 value:
   *                   success: false
   *                   errors:
   *                     message: "Price must be ₹240 for regular pricing (2 × ₹120)"
   *               comboValidationError:
   *                 summary: Combo validation error
   *                 value:
   *                   success: false
   *                   errors:
   *                     message: "Quantity must be exactly 3 for combo discount"
   *               comboPriceMismatch:
   *                 summary: Combo price mismatch error
   *                 value:
   *                   success: false
   *                   errors:
   *                     message: "Price must be ₹340 for combo discount (total for 3 items)"
   *               variantNotFound:
   *                 summary: Variant not found
   *                 value:
   *                   success: false
   *                   errors:
   *                     message: "Product variant not found or does not belong to the specified product"
   */
  router.post('/add-to-cart', isAuthenticated, validate(saveCartSchema), saveCart);

  /**
   * @swagger
   * /get-cart:
   *   post:
   *     summary: Get user's cart items
   *     tags: [Cart]
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
   *                 description: Filter cart items by vendor ID (optional)
   *               branchId:
   *                 type: integer
   *                 example: 1
   *                 description: Filter cart items by branch ID (optional)
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
   *           examples:
   *             basic:
   *               summary: Get all cart items
   *               value: {}
   *             withPagination:
   *               summary: Get cart items with pagination
   *               value:
   *                 pageSize: 20
   *                 pageNumber: 1
   *             withFilters:
   *               summary: Get cart items filtered by vendor
   *               value:
   *                 vendorId: 1
   *                 pageSize: 10
   *                 pageNumber: 1
   *             withSorting:
   *               summary: Get cart items sorted by creation date
   *               value:
   *                 pageSize: 10
   *                 pageNumber: 1
   *                 sorting:
   *                   - key: "created_at"
   *                     direction: "DESC"
   *             withMultipleFilters:
   *               summary: Get cart items with multiple filters
   *               value:
   *                 vendorId: 1
   *                 branchId: 2
   *                 pageSize: 10
   *                 pageNumber: 1
   *                 filters:
   *                   - key: "combo_id"
   *                     eq: "null"
   *                 sorting:
   *                   - key: "total_price"
   *                     direction: "DESC"
   *     responses:
   *       200:
   *         description: Cart items retrieved successfully
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
   *                       product_id:
   *                         type: integer
   *                         example: 1
   *                       variant_id:
   *                         type: integer
   *                         example: 1
   *                       vendor_id:
   *                         type: integer
   *                         example: 1
   *                       branch_id:
   *                         type: integer
   *                         example: 1
   *                       quantity:
   *                         type: integer
   *                         example: 2
   *                       combo_id:
   *                         type: integer
   *                         nullable: true
   *                         example: null
   *                       unit_price:
   *                         type: number
   *                         example: 120
   *                       total_price:
   *                         type: number
   *                         example: 240
   *                       status:
   *                         type: string
   *                         example: "ACTIVE"
   *                       created_at:
   *                         type: string
   *                         format: date-time
   *                       updated_at:
   *                         type: string
   *                         format: date-time
   *                       concurrency_stamp:
   *                         type: string
   *                         format: uuid
   *                       productDetails:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                             example: 1
   *                           title:
   *                             type: string
   *                             example: "Fresh Milk"
   *                       variant:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                             example: 1
   *                           variant_name:
   *                             type: string
   *                             example: "500ml"
   *                           selling_price:
   *                             type: number
   *                             example: 120
   *                           quantity:
   *                             type: integer
   *                             example: 50
   *                           product_status:
   *                             type: string
   *                             enum: [INSTOCK, OUT-OF-STOCK]
   *                             example: "INSTOCK"
   *                           product:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: integer
   *                                 example: 1
   *                               title:
   *                                 type: string
   *                                 example: "Fresh Milk"
   *                               images:
   *                                 type: array
   *                                 items:
   *                                   type: object
   *                                   properties:
   *                                     id:
   *                                       type: integer
   *                                     image_url:
   *                                       type: string
   *                       user:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                             example: 1
   *                           name:
   *                             type: string
   *                             example: "John Doe"
   *                           email:
   *                             type: string
   *                             example: "john@example.com"
   *                           mobile_number:
   *                             type: string
   *                             example: "9876543210"
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     pageSize:
   *                       type: integer
   *                       example: 10
   *                     pageNumber:
   *                       type: integer
   *                       example: 1
   *                     totalCount:
   *                       type: integer
   *                       example: 5
   *                     totalPages:
   *                       type: integer
   *                       example: 1
   *                     paginationEnabled:
   *                       type: boolean
   *                       example: false
   *             examples:
   *               success:
   *                 summary: Cart items retrieved successfully
   *                 value:
   *                   success: true
   *                   doc:
   *                     - id: 15
   *                       product_id: 1
   *                       variant_id: 5
   *                       vendor_id: 1
   *                       branch_id: 2
   *                       quantity: 2
   *                       is_combo: false
   *                       unit_price: 120
   *                       total_price: 240
   *                       status: "ACTIVE"
   *                       created_at: "2025-01-25T10:30:00.000Z"
   *                       updated_at: "2025-01-25T10:30:00.000Z"
   *                       concurrency_stamp: "550e8400-e29b-41d4-a716-446655440000"
   *                       productDetails:
   *                         id: 1
   *                         title: "Fresh Milk"
   *                       variant:
   *                         id: 5
   *                         variant_name: "500ml"
   *                         selling_price: 120
   *                         quantity: 50
   *                         product_status: "INSTOCK"
   *                         product:
   *                           id: 1
   *                           title: "Fresh Milk"
   *                           images:
   *                             - id: 10
   *                               image_url: "https://example.com/images/milk.jpg"
   *                       user:
   *                         id: 1
   *                         name: "John Doe"
   *                         email: "john@example.com"
   *                         mobile_number: "9876543210"
   *                     - id: 16
   *                       product_id: 2
   *                       variant_id: 8
   *                       vendor_id: 1
   *                       branch_id: 2
   *                       quantity: 3
   *                       combo_id: 10
   *                       unit_price: 324
   *                       total_price: 972
   *                       status: "ACTIVE"
   *                       created_at: "2025-01-25T11:00:00.000Z"
   *                       updated_at: "2025-01-25T11:00:00.000Z"
   *                       concurrency_stamp: "660e8400-e29b-41d4-a716-446655440001"
   *                       productDetails:
   *                         id: 2
   *                         title: "Organic Eggs"
   *                       variant:
   *                         id: 8
   *                         variant_name: "Dozen"
   *                         selling_price: 150
   *                         quantity: 30
   *                         product_status: "INSTOCK"
   *                         product:
   *                           id: 2
   *                           title: "Organic Eggs"
   *                           images:
   *                             - id: 15
   *                               image_url: "https://example.com/images/eggs.jpg"
   *                       user:
   *                         id: 1
   *                         name: "John Doe"
   *                         email: "john@example.com"
   *                         mobile_number: "9876543210"
   *                   pagination:
   *                     pageSize: 10
   *                     pageNumber: 1
   *                     totalCount: 2
   *                     totalPages: 1
   *                     paginationEnabled: false
   *               emptyCart:
   *                 summary: Empty cart
   *                 value:
   *                   success: true
   *                   doc: []
   *                   pagination:
   *                     pageSize: 10
   *                     pageNumber: 1
   *                     totalCount: 0
   *                     totalPages: 0
   *                     paginationEnabled: false
   */
  router.post('/get-cart', isAuthenticated, validate(getCartSchema), getCart);

  /**
   * @swagger
   * /delete-cart:
   *   delete:
   *     summary: Remove item from cart
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: cartId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Cart item ID to delete
   *         example: 15
   *     responses:
   *       200:
   *         description: Item removed from cart successfully
   *         headers:
   *           message:
   *             schema:
   *               type: string
   *             example: "successfully deleted"
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
   *                   example: "successfully deleted"
   *       400:
   *         description: Validation error or cart item not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 errors:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Parameter: cartId is required in query"
   *             examples:
   *               success:
   *                 summary: Item deleted successfully
   *                 value:
   *                   success: true
   *                   message: "successfully deleted"
   *               validationError:
   *                 summary: Validation error
   *                 value:
   *                   success: false
   *                   errors:
   *                     message: "Parameter: cartId is required in query"
   */
  router.delete('/delete-cart', isAuthenticated, validate(deleteCartSchema), deleteCart);

  /**
   * @swagger
   * /update-cart/{id}:
   *   patch:
   *     summary: Update cart item quantity, price, or combo status
   *     tags: [Cart]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Cart item ID
   *         example: 15
   *       - in: header
   *         name: x-concurrencystamp
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Concurrency stamp for optimistic locking (required)
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
   *               quantity:
   *                 type: integer
   *                 minimum: 0
   *                 example: 3
   *                 description: New quantity (optional - if 0, item is removed from cart; price is calculated automatically)
   *               comboId:
   *                 type: integer
   *                 nullable: true
   *                 example: null
   *                 description: "Combo discount ID (optional - if provided, price is calculated automatically as combo price for one combo set; if set to null, switches from combo to regular)"
   *               updatedBy:
   *                 type: integer
   *                 example: 1
   *                 description: User ID who is updating the cart item (required)
   *               concurrencyStamp:
   *                 type: string
   *                 format: uuid
   *                 example: "550e8400-e29b-41d4-a716-446655440000"
   *                 description: Concurrency stamp from previous response (required)
   *           examples:
   *             updateQuantity:
   *               summary: Update quantity only
   *               description: "Example: Updating quantity to 5, price calculated automatically as 5 × ₹120 = ₹600"
   *               value:
   *                 quantity: 5
   *                 updatedBy: 1
   *                 concurrencyStamp: "550e8400-e29b-41d4-a716-446655440000"
   *             updateCombo:
   *               summary: Update combo status
   *               description: "Example: Updating to combo with quantity 2, price calculated automatically as combo price per set ₹324 (PERCENT discount)"
   *               value:
   *                 quantity: 2
   *                 comboId: 10
   *                 updatedBy: 1
   *                 concurrencyStamp: "550e8400-e29b-41d4-a716-446655440000"
   *             removeItem:
   *               summary: Remove item (set quantity to 0)
   *               value:
   *                 quantity: 0
   *                 updatedBy: 1
   *                 concurrencyStamp: "550e8400-e29b-41d4-a716-446655440000"
   *     responses:
   *       200:
   *         description: Cart item updated successfully or removed (if quantity is 0)
   *         headers:
   *           x-concurrencystamp:
   *             schema:
   *               type: string
   *               format: uuid
   *             description: New concurrency stamp for optimistic locking
   *           message:
   *             schema:
   *               type: string
   *             example: "successfully updated."
   *         content:
   *           application/json:
   *             schema:
   *               oneOf:
   *                 - type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "item removed from cart"
   *                 - type: object
   *                   properties:
   *                     success:
   *                       type: boolean
   *                       example: true
   *                     message:
   *                       type: string
   *                       example: "successfully updated"
   *       409:
   *         description: Concurrency conflict - cart item was modified by another request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 errors:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Concurrency error"
   *       400:
   *         description: Validation error (price mismatch, combo validation failed, etc.)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 errors:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Price must be ₹240 for regular pricing (2 × ₹120)"
   *             examples:
   *               success:
   *                 summary: Cart item updated successfully
   *                 value:
   *                   success: true
   *                   message: "successfully updated"
   *               itemRemoved:
   *                 summary: Item removed (quantity set to 0)
   *                 value:
   *                   message: "item removed from cart"
   *               concurrencyError:
   *                 summary: Concurrency conflict
   *                 value:
   *                   success: false
   *                   errors:
   *                     message: "Concurrency error"
   *               priceMismatch:
   *                 summary: Price validation error
   *                 value:
   *                   success: false
   *                   errors:
   *                     message: "Price must be ₹240 for regular pricing (2 × ₹120)"
   *       404:
   *         description: Cart item not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 errors:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Cart item not found"
   */
  router.patch('/update-cart/:id', isAuthenticated, validate(updateCartSchema), updateCart);
};
