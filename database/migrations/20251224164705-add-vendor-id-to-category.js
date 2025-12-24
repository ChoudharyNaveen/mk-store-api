module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn('category', 'vendor_id', {
      type: Sequelize.UUID,
      allowNull: false,
      index: true,
      after: 'branch_id',
    }),
  down: (queryInterface) =>
    queryInterface.removeColumn('category', 'vendor_id'),
}

