const role = require('../seed/seed-role')

module.exports = {
  up: (queryInterface) => queryInterface.bulkInsert('role', role, {}),
  down: (queryInterface) => queryInterface.truncate('role', {}),
}
