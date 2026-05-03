/** @param {import('sequelize').QueryInterface} queryInterface @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('product_variant', 'max_order_quantity', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Max units of this variant per order line (cart quantity / combo sets); null = no limit',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('product_variant', 'max_order_quantity');
  },
};
