module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('address', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      public_id: {
        type: Sequelize.UUID,
        unique: true,
      },
      house_no: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      street_details: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      landmark: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mobile_number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        index: true,
        defaultValue: 'ACTIVE',
      },
      concurrency_stamp: {
        type: Sequelize.UUID,
        unique: true,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.UUID,
      },
      updated_by: {
        type: Sequelize.UUID,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    }),
  down: (queryInterface) => queryInterface.dropTable('address'),
}
