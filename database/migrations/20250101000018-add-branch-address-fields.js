module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('branch', 'address_line1', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    await queryInterface.addColumn('branch', 'address_line2', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    await queryInterface.addColumn('branch', 'street', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    await queryInterface.addColumn('branch', 'city', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    await queryInterface.addColumn('branch', 'state', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    await queryInterface.addColumn('branch', 'pincode', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    await queryInterface.addColumn('branch', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
    })

    await queryInterface.addColumn('branch', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
    })

    // Add indexes for better query performance
    await queryInterface.addIndex('branch', ['state'])
    await queryInterface.addIndex('branch', ['pincode'])
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('branch', ['state'])
    await queryInterface.removeIndex('branch', ['pincode'])
    
    await queryInterface.removeColumn('branch', 'address_line1')
    await queryInterface.removeColumn('branch', 'address_line2')
    await queryInterface.removeColumn('branch', 'street')
    await queryInterface.removeColumn('branch', 'city')
    await queryInterface.removeColumn('branch', 'state')
    await queryInterface.removeColumn('branch', 'pincode')
    await queryInterface.removeColumn('branch', 'latitude')
    await queryInterface.removeColumn('branch', 'longitude')
  },
}

