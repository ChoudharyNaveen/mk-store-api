module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('order', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      address_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'),
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
      rider_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      concurrency_stamp: {
        type: Sequelize.UUID,
        unique: true,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    })

    await queryInterface.addIndex('order', ['branch_id'])
    await queryInterface.addIndex('order', ['address_id'])
    await queryInterface.addIndex('order', ['status'])
    await queryInterface.addIndex('order', ['payment_status'])

    // Add foreign key constraints
    await queryInterface.addConstraint('order', {
      fields: ['branch_id'],
      type: 'foreign key',
      name: 'fk_order_branch',
      references: {
        table: 'branch',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    })

    await queryInterface.addConstraint('order', {
      fields: ['address_id'],
      type: 'foreign key',
      name: 'fk_order_address',
      references: {
        table: 'address',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    })

    await queryInterface.addConstraint('order', {
      fields: ['created_by'],
      type: 'foreign key',
      name: 'fk_order_user',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    })

    await queryInterface.addConstraint('order', {
      fields: ['rider_id'],
      type: 'foreign key',
      name: 'fk_order_rider',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('order')
  },
}

