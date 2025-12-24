module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendor_user', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      public_id: {
        type: Sequelize.UUID,
        unique: true,
        allowNull: false,
      },
      vendor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        index: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        index: true,
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        index: true,
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
    })

    // Unique constraint: one user can only be associated with one vendor
    await queryInterface.addIndex('vendor_user', ['vendor_id', 'user_id'], {
      name: 'unique_vendor_user',
      unique: true,
    })

    // Index for querying by vendor and role
    await queryInterface.addIndex('vendor_user', ['vendor_id', 'role_id'], {
      name: 'idx_vendor_user_role',
    })
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('vendor_user')
  },
}

