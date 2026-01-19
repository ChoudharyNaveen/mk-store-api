const User = require('./userService');
const Category = require('./categoryService');
const SubCategory = require('./subCategoryService');
const Product = require('./productService');
const ProductVariant = require('./productVariantService');
const ProductImage = require('./productImageService');
const Promocode = require('./promocodeService');
const Offer = require('./offerService');
const Otp = require('./otpService');
const Address = require('./addressService');
const Wishlist = require('./wishlistService');
const Cart = require('./cartService');
const Order = require('./orderService');
const OrderItem = require('./orderItemService');
const Vendor = require('./vendorService');
const Branch = require('./branchService');
const Brand = require('./brandService');
const Notification = require('./notificationService');
const Shipping = require('./shippingService');
const InventoryMovement = require('./inventoryMovementService');
const Dashboard = require('./dashboardService');

module.exports = {
  User,
  Category,
  SubCategory,
  Product,
  ProductVariant,
  ProductImage,
  Promocode,
  Offer,
  Otp,
  Address,
  Wishlist,
  Cart,
  Order,
  OrderItem,
  Vendor,
  Branch,
  Brand,
  Notification,
  Shipping,
  InventoryMovement,
  Dashboard,
};
