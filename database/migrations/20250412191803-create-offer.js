module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('offer', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      public_id: { type: Sequelize.UUID, unique: true },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      min_order_price: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      percentage: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE',
        index: true,
      },
      concurrency_stamp: {
        type: Sequelize.UUID,
        unique: true,
        allowNull: false,
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
    }),
  down: (queryInterface) => queryInterface.dropTable('offer'),
}
