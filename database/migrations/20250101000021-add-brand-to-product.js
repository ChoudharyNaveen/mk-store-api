module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add brand_id column to product table
    await queryInterface.addColumn('product', 'brand_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null initially for existing products
    });

    // Add index for brand_id
    await queryInterface.addIndex('product', [ 'brand_id' ]);

    // Add foreign key constraint
    await queryInterface.addConstraint('product', {
      fields: [ 'brand_id' ],
      type: 'foreign key',
      name: 'fk_product_brand',
      references: {
        table: 'brand',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    // Remove foreign key constraint
    await queryInterface.removeConstraint('product', 'fk_product_brand');
    
    // Remove index
    await queryInterface.removeIndex('product', [ 'brand_id' ]);
    
    // Remove column
    await queryInterface.removeColumn('product', 'brand_id');
  },
};

