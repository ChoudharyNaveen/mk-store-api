module.exports = (sequelize, DataTypes) => {
  const product = sequelize.define(
    'product',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nutritional: {
        type: DataTypes.TEXT,
        allowNull: true,
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

  product.associate = (models) => {
    product.belongsTo(models.category, {
      foreignKey: 'category_id',
      targetKey: 'id',
      as: 'category',
    });
    product.belongsTo(models.subCategory, {
      foreignKey: 'sub_category_id',
      targetKey: 'id',
      as: 'subCategory',
    });
    product.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
    product.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
    });
    product.belongsTo(models.brand, {
      foreignKey: 'brand_id',
      targetKey: 'id',
      as: 'brand',
    });
    product.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
    product.hasMany(models.cart, {
      foreignKey: 'product_id',
      sourceKey: 'id',
      as: 'cartItems',
    });
    product.hasMany(models.wishlist, {
      foreignKey: 'product_id',
      sourceKey: 'id',
      as: 'wishlistItems',
    });
    product.hasMany(models.orderItem, {
      foreignKey: 'product_id',
      sourceKey: 'id',
      as: 'orderItems',
    });
    product.hasMany(models.productVariant, {
      foreignKey: 'product_id',
      sourceKey: 'id',
      as: 'variants',
    });
    product.hasMany(models.productImage, {
      foreignKey: 'product_id',
      sourceKey: 'id',
      as: 'images',
    });
    product.hasMany(models.inventoryMovement, {
      foreignKey: 'product_id',
      sourceKey: 'id',
      as: 'inventoryMovements',
    });
  };

  return product;
};
