const user = require('./user');
const category = require('./category');
const subCategory = require('./subCategory');
const product = require('./product');
const productVariant = require('./productVariant');
const productImage = require('./productImage');
const promocode = require('./promocode');
const offer = require('./offer');
const otp = require('./otp');
const address = require('./address');
const cart = require('./cart');
const wishlist = require('./wishlist');
const order = require('./order');
const orderItem = require('./orderItem');
const vendor = require('./vendor');
const branch = require('./branch');
const brand = require('./brand');
const notification = require('./notification');
const shipping = require('./shipping');
const inventory = require('./inventory');
const dashboard = require('./dashboard');

module.exports = {
  ...user,
  ...category,
  ...subCategory,
  ...product,
  ...productVariant,
  ...productImage,
  ...promocode,
  ...offer,
  ...otp,
  ...address,
  ...cart,
  ...wishlist,
  ...order,
  ...orderItem,
  ...vendor,
  ...branch,
  ...brand,
  ...notification,
  ...shipping,
  ...inventory,
  ...dashboard,
};
