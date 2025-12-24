const user = require('./user')
const category = require('./category')
const subCategory = require('./subCategory')
const product = require('./product')
const promocode = require('./promocode')
const offer = require('./offer')
const otp = require('./otp')
const address = require('./address')
const cart = require('./cart')
const wishlist = require('./wishlist')
const order = require('./order')
const orderItem = require('./orderItem')

module.exports = {
  ...user,
  ...category,
  ...subCategory,
  ...product,
  ...promocode,
  ...offer,
  ...otp,
  ...address,
  ...cart,
  ...wishlist,
  ...order,
  ...orderItem,
}
