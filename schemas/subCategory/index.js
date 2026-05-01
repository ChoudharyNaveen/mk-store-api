const getSubCategory = require('./getSubCategory');
const getSubCategoriesByCategoryId = require('./getSubCategoriesByCategoryId');
const getSubCategoryStats = require('./getSubCategoryStats');
const saveSubCategory = require('./saveSubCategory');
const updateSubCategory = require('./updateSubCategory');
const deleteSubCategoryById = require('../deleteByIdParam');

module.exports = {
  getSubCategory,
  getSubCategoriesByCategoryId,
  getSubCategoryStats,
  saveSubCategory,
  updateSubCategory,
  deleteSubCategoryById,
};
