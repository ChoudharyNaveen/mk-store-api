module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product', {
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
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sub_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
        allowNull: false,
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

    await queryInterface.addIndex('product', [ 'branch_id' ]);
    await queryInterface.addIndex('product', [ 'vendor_id' ]);
    await queryInterface.addIndex('product', [ 'category_id' ]);
    await queryInterface.addIndex('product', [ 'product_status' ]);
    await queryInterface.addIndex('product', [ 'status' ]);

    // Add foreign key constraints
    await queryInterface.addConstraint('product', {
      fields: [ 'category_id' ],
      type: 'foreign key',
      name: 'fk_product_category',
      references: {
        table: 'category',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('product', {
      fields: [ 'sub_category_id' ],
      type: 'foreign key',
      name: 'fk_product_subcategory',
      references: {
        table: 'subCategory',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('product', {
      fields: [ 'branch_id' ],
      type: 'foreign key',
      name: 'fk_product_branch',
      references: {
        table: 'branch',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('product', {
      fields: [ 'vendor_id' ],
      type: 'foreign key',
      name: 'fk_product_vendor',
      references: {
        table: 'vendor',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('product', {
      fields: [ 'created_by' ],
      type: 'foreign key',
      name: 'fk_product_created_by',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('product');
  },
};





