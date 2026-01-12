module.exports = (sequelize, DataTypes) => {
  const productVariant = sequelize.define(
    'productVariant',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      variant_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      variant_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'WEIGHT, SIZE, COLOR, MATERIAL, FLAVOR, PACKAGING, OTHER',
      },
      variant_value: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      selling_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      items_per_unit: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      units: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      item_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      item_unit: {
        type: DataTypes.STRING,
        allowNull: true,
        enum: [
          'LTR', 'ML', 'GAL', 'FL_OZ',
          'KG', 'G', 'MG', 'OZ', 'LB', 'TON',
          'PCS', 'UNIT', 'DOZEN', 'SET', 'PAIR', 'BUNDLE',
          'PKG', 'BOX', 'BOTTLE', 'CAN', 'CARTON', 'TUBE', 'JAR', 'BAG', 'POUCH',
          'M', 'CM', 'MM', 'FT', 'IN',
          'SQFT', 'SQM',
        ],
      },
      expiry_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      product_status: {
        type: DataTypes.STRING,
        enum: [ 'INSTOCK', 'OUT-OF-STOCK' ],
        defaultValue: 'INSTOCK',
        index: true,
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
      tableName: 'product_variant',
    },
  );

  productVariant.associate = (models) => {
    productVariant.belongsTo(models.product, {
      foreignKey: 'product_id',
      targetKey: 'id',
      as: 'product',
    });
    productVariant.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
    productVariant.belongsTo(models.user, {
      foreignKey: 'updated_by',
      targetKey: 'id',
      as: 'updatedByUser',
    });
    productVariant.hasMany(models.productImage, {
      foreignKey: 'variant_id',
      sourceKey: 'id',
      as: 'images',
    });
    productVariant.hasMany(models.cart, {
      foreignKey: 'variant_id',
      sourceKey: 'id',
      as: 'cartItems',
    });
    productVariant.hasMany(models.orderItem, {
      foreignKey: 'variant_id',
      sourceKey: 'id',
      as: 'orderItems',
    });
    productVariant.hasMany(models.inventoryMovement, {
      foreignKey: 'variant_id',
      sourceKey: 'id',
      as: 'inventoryMovements',
    });
  };

  return productVariant;
};
