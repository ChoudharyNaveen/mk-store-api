module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn('product', 'vendor_id', {
      type: Sequelize.UUID,
      allowNull: false,
      index: true,
      after: 'branch_id',
    }),
  down: (queryInterface) =>
    queryInterface.removeColumn('product', 'vendor_id'),
}

