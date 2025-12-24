module.exports = {
  up: async (queryInterface) => {
    // Remove vendor_admin_id column from vendor table if it exists
    const tableDescription = await queryInterface.describeTable('vendor')
    if (tableDescription.vendor_admin_id) {
      await queryInterface.removeColumn('vendor', 'vendor_admin_id')
    }
  },
  down: async (queryInterface, Sequelize) => {
    // Re-add vendor_admin_id if needed for rollback
    await queryInterface.addColumn('vendor', 'vendor_admin_id', {
      type: Sequelize.UUID,
      allowNull: true,
      unique: true,
      index: true,
      after: 'public_id',
    })
  },
}

