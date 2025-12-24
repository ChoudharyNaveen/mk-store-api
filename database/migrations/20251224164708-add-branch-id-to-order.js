module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn('order', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: false,
      index: true,
      after: 'public_id',
    }),
  down: (queryInterface) =>
    queryInterface.removeColumn('order', 'branch_id'),
}

