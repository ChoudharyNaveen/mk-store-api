module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn('category', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: false,
      index: true,
      after: 'public_id',
    }),
  down: (queryInterface) =>
    queryInterface.removeColumn('category', 'branch_id'),
}

