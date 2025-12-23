module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('order', {
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
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'PENDING',
          'CONFIRMED',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED'
        ),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      payment_status: {
        type: Sequelize.ENUM('PAID', 'UNPAID', 'FAILED'),
        allowNull: false,
        defaultValue: 'UNPAID',
      },
      pickup_status: {
        type: Sequelize.ENUM('OPEN', 'ACCEPT'),
        allowNull: true,
        defaultValue: 'OPEN',
      },
      rider_id:{
        type:Sequelize.UUID,
        allowNull: true
      },
      address_id: {
        type: Sequelize.UUID,
        allowNull: false,
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
  down: (queryInterface) => queryInterface.dropTable('order'),
}
