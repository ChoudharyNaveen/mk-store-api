module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn('user', 'vendor_id', {
      type: Sequelize.UUID,
      allowNull: true,
      index: true,
      after: 'role_id',
    }),
  down: (queryInterface) =>
    queryInterface.removeColumn('user', 'vendor_id'),
}

