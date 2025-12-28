module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('brand', {
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
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true,
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
    });

    await queryInterface.addIndex('brand', [ 'branch_id' ]);
    await queryInterface.addIndex('brand', [ 'vendor_id' ]);
    await queryInterface.addIndex('brand', [ 'status' ]);
    // Make name unique per vendor (same brand name can exist for different vendors)
    await queryInterface.addIndex('brand', [ 'vendor_id', 'name' ], {
      unique: true,
      name: 'unique_brand_per_vendor',
    });

    // Add foreign key constraints
    await queryInterface.addConstraint('brand', {
      fields: [ 'branch_id' ],
      type: 'foreign key',
      name: 'fk_brand_branch',
      references: {
        table: 'branch',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('brand', {
      fields: [ 'vendor_id' ],
      type: 'foreign key',
      name: 'fk_brand_vendor',
      references: {
        table: 'vendor',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('brand', {
      fields: [ 'created_by' ],
      type: 'foreign key',
      name: 'fk_brand_created_by',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('brand');
  },
};

