module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make password nullable
    await queryInterface.changeColumn('user', 'password', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    // Make name nullable
    await queryInterface.changeColumn('user', 'name', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    // Make email nullable
    await queryInterface.changeColumn('user', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
    })

    // Add profile_status column
    await queryInterface.addColumn('user', 'profile_status', {
      type: Sequelize.ENUM('INCOMPLETE', 'COMPLETE'),
      defaultValue: 'INCOMPLETE',
      allowNull: false,
      after: 'status',
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user', 'profile_status')
    await queryInterface.changeColumn('user', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
    })
    await queryInterface.changeColumn('user', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    })
    await queryInterface.changeColumn('user', 'password', {
      type: Sequelize.STRING,
      allowNull: false,
    })
  },
}

