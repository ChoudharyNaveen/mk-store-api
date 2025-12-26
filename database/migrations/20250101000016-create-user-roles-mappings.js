module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_roles_mappings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Optional
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE',
        allowNull: false,
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

    await queryInterface.addIndex('user_roles_mappings', ['user_id'])
    await queryInterface.addIndex('user_roles_mappings', ['role_id'])
    await queryInterface.addIndex('user_roles_mappings', ['vendor_id'])
    await queryInterface.addIndex('user_roles_mappings', ['status'])
    await queryInterface.addIndex('user_roles_mappings', ['vendor_id', 'user_id'], {
      name: 'idx_user_roles_mapping_vendor_user',
    })
    await queryInterface.addIndex('user_roles_mappings', ['vendor_id', 'role_id'], {
      name: 'idx_user_roles_mapping_vendor_role',
    })
    await queryInterface.addIndex('user_roles_mappings', ['user_id', 'role_id'], {
      name: 'idx_user_roles_mapping_user_role',
    })

    // Add foreign key constraints
    await queryInterface.addConstraint('user_roles_mappings', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_user_roles_mappings_user',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    })

    await queryInterface.addConstraint('user_roles_mappings', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'fk_user_roles_mappings_role',
      references: {
        table: 'role',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    })

    await queryInterface.addConstraint('user_roles_mappings', {
      fields: ['vendor_id'],
      type: 'foreign key',
      name: 'fk_user_roles_mappings_vendor',
      references: {
        table: 'vendor',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_roles_mappings')
  },
}


