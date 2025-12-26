module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add foreign key for vendor.created_by
    await queryInterface.addConstraint('vendor', {
      fields: ['created_by'],
      type: 'foreign key',
      name: 'fk_vendor_created_by',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('vendor', 'fk_vendor_created_by')
  },
}



