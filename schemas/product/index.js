const getProduct = require('./getProduct');
const saveProduct = require('./saveProduct');
const updateProduct = require('./updateProduct');
const deleteProduct = require('./deleteProduct');
const getProductsGroupedByCategory = require('./getProductsGroupedByCategory');

module.exports = {
  getProduct,
  saveProduct,
  updateProduct,
  deleteProduct,
  getProductsGroupedByCategory,
};
