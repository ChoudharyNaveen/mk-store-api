module.exports = (sequelize, DataTypes) => {
  const cart = sequelize.define(
    'cart',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
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
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      combo_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Combo discount ID if this is a combo item, NULL for regular items',
      },
      unit_price: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Unit price at time of adding to cart',
      },
      total_price: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total price (unit_price × quantity) at time of adding to cart',
      },
      status: {
        type: DataTypes.STRING,
        enum: [ 'ACTIVE', 'INACTIVE' ],
        defaultValue: 'ACTIVE',
        index: true,
      },
      concurrency_stamp: {
        type: DataTypes.UUID,
        unique: true,
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

  cart.associate = (models) => {
    cart.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'user',
    });
    cart.belongsTo(models.product, {
      foreignKey: 'product_id',
      targetKey: 'id',
      as: 'productDetails',
    });
    cart.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
    });
    cart.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
    cart.belongsTo(models.productVariant, {
      foreignKey: 'variant_id',
      targetKey: 'id',
      as: 'variant',
    });
    cart.belongsTo(models.variantComboDiscount, {
      foreignKey: 'combo_id',
      targetKey: 'id',
      as: 'comboDiscount',
    });
  };

  return cart;
};
