module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('otp', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      type: {
        type: Sequelize.STRING,
        defaultValue: 'user-registration',
        allowNull: false,
        index: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        index: true,
      },
      mobile_number: {
        type: Sequelize.STRING,
        allowNull: true,
        index: true,
      },
      otp: { type: Sequelize.STRING, allowNull: false },
      text: { type: Sequelize.STRING, allowNull: true },
      validity: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE',
        index: true,
      },
      created_by: { type: Sequelize.UUID },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_by: { type: Sequelize.UUID },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('otp')
  },
}
