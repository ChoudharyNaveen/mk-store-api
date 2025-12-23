module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('product', {
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
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      price: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      selling_price: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      sub_category_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      nutritional: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      units: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      product_status: {
        type: Sequelize.ENUM('INSTOCK', 'OUT-OF-STOCK'),
        defaultValue: 'INSTOCK',
        index: true,
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
  down: (queryInterface) => queryInterface.dropTable('product'),
}
