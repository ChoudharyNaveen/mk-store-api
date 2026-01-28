module.exports = (sequelize, DataTypes) => {
  const orderItem = sequelize.define(
    'orderItem',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
      },
      variant_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Snapshot for historical accuracy',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price_at_purchase: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      combo_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Combo discount ID if this is a combo item, NULL for regular items',
      },
      subtotal: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Total price before discount (quantity * price_at_purchase or combo price)',
      },
      discount_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Discount amount applied to this item (from offer/promocode)',
      },
      concurrency_stamp: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
      },
      updated_by: {
        type: DataTypes.INTEGER,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    },
  );

  orderItem.associate = (models) => {
    orderItem.belongsTo(models.order, {
      foreignKey: 'order_id',
      targetKey: 'id',
      as: 'order',
    });
    orderItem.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'user',
    });
    orderItem.belongsTo(models.product, {
      foreignKey: 'product_id',
      targetKey: 'id',
      as: 'product',
    });
    orderItem.belongsTo(models.productVariant, {
      foreignKey: 'variant_id',
      targetKey: 'id',
      as: 'variant',
    });
    orderItem.belongsTo(models.variantComboDiscount, {
      foreignKey: 'combo_id',
      targetKey: 'id',
      as: 'comboDiscount',
    });
  };

  return orderItem;
};
