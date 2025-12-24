module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn('product', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: false,
      index: true,
      after: 'public_id',
    }),
  down: (queryInterface) =>
    queryInterface.removeColumn('product', 'branch_id'),
}

