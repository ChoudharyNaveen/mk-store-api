const User = require('./userService')
const Category = require('./categoryService')
const SubCategory = require('./subCategoryService')
const Product = require('./productService')
const Promocode = require('./promocodeService')
const Offer = require('./offerService')
const Otp = require('./otpService')
const Address  = require('./addressService')
const Wishlist = require('./wishlistService')
const Cart = require('./cartService')
const Order = require('./orderService')
const OrderItem = require('./orderItemService')

module.exports = {
  User,
  Category,
  SubCategory,
  Product,
  Promocode,
  Offer,
  Otp,
  Address,
  Wishlist,
  Cart,
  Order,
  OrderItem
}
