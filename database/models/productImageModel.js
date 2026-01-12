module.exports = (sequelize, DataTypes) => {
  const productImage = sequelize.define(
    'productImage',
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
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        index: true,
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      tableName: 'product_image',
    },
  );

  productImage.associate = (models) => {
    productImage.belongsTo(models.product, {
      foreignKey: 'product_id',
      targetKey: 'id',
      as: 'product',
    });
    productImage.belongsTo(models.productVariant, {
      foreignKey: 'variant_id',
      targetKey: 'id',
      as: 'variant',
    });
    productImage.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
    productImage.belongsTo(models.user, {
      foreignKey: 'updated_by',
      targetKey: 'id',
      as: 'updatedByUser',
    });
  };

  return productImage;
};
