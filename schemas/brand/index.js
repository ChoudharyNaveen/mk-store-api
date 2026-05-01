const getBrand = require('./getBrand');
const getBrandSummary = require('./getBrandSummary');
const saveBrand = require('./saveBrand');
const updateBrand = require('./updateBrand');
const deleteBrand = require('./deleteBrand');
const deleteBrandById = require('../deleteByIdParam');

module.exports = {
  getBrand,
  getBrandSummary,
  saveBrand,
  updateBrand,
  deleteBrand,
  deleteBrandById,
};
