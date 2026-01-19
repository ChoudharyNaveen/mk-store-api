const getProduct = require('./getProduct');
const saveProduct = require('./saveProduct');
const updateProduct = require('./updateProduct');
const deleteProduct = require('./deleteProduct');
const getProductsGroupedByCategory = require('./getProductsGroupedByCategory');
const getProductStats = require('./getProductStats');

module.exports = {
  getProduct,
  saveProduct,
  updateProduct,
  deleteProduct,
  getProductsGroupedByCategory,
  getProductStats,
};
