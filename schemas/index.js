const user = require('./user')
const category = require('./category')
const subCategory = require('./subCategory')
const product = require('./product')
const promocode = require('./promocode')
const offer = require('./offer')
const otp = require('./otp')
const address = require('./address')
const cart = require('./cart')

module.exports = {
  ...user,
  ...category,
  ...subCategory,
  ...product,
  ...promocode,
  ...offer,
  ...otp,
  ...address,
  ...cart
}
