const savePromocode = require('./savePromocode');
const getPromocode = require('./getPromocode');
const getPromocodeSummary = require('./getPromocodeSummary');
const updatePromocode = require('./updatePromocode');
const deletePromocodeById = require('../deleteByIdParam');

module.exports = {
  savePromocode,
  getPromocode,
  getPromocodeSummary,
  updatePromocode,
  deletePromocodeById,
};
