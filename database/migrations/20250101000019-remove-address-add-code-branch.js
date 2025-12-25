module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove address column
    await queryInterface.removeColumn('branch', 'address')

    // Add code column
    await queryInterface.addColumn('branch', 'code', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    })

    // Add index for code
    await queryInterface.addIndex('branch', ['code'])
  },

  down: async (queryInterface, Sequelize) => {
    // Remove code index and column
    await queryInterface.removeIndex('branch', ['code'])
    await queryInterface.removeColumn('branch', 'code')

    // Add back address column
    await queryInterface.addColumn('branch', 'address', {
      type: Sequelize.TEXT,
      allowNull: false,
    })
  },
}

