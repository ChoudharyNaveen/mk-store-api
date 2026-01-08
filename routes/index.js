const express = require('express');

const router = express.Router();

const user = require('./user');
const category = require('./category');
const SubCategory = require('./subCategory');
const product = require('./product');
const promocode = require('./promocode');
const offer = require('./offer');
const otp = require('./otp');
const indexRouter = require('./indexRouter');
const address = require('./address');
const wishlist = require('./wishlist');
const cart = require('./cart');
const order = require('./order');
const orderItem = require('./orderItem');
const vendor = require('./vendor');
const branch = require('./branch');
const brand = require('./brand');
const notification = require('./notification');

user(router);
category(router);
SubCategory(router);
product(router);
promocode(router);
offer(router);
otp(router);
indexRouter(router);
address(router);
wishlist(router);
cart(router);
order(router);
orderItem(router);
vendor(router);
branch(router);
brand(router);
notification(router);

module.exports = router;
