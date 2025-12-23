'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('offer', 'status')
    await queryInterface.addColumn('offer', 'status', {
      type: Sequelize.ENUM('OPEN', 'ACTIVE', 'INACTIVE'),
      defaultValue: 'OPEN',
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('offer', 'status')

    await queryInterface.addColumn('offer', 'status', {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE',
    })
  },
}
