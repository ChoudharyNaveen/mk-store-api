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
      public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
        unique: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
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
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sub_category_id: {
        type: DataTypes.UUID,
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
      units: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      product_status: {
        type: DataTypes.STRING,
        enum: ['INSTOCK', 'OUT-OF-STOCK'],
        defaultValue: 'INSTOCK',
        index: true,
      },
      status: {
        type: DataTypes.STRING,
        enum: ['ACTIVE', 'INACTIVE'],
        defaultValue: 'ACTIVE',
        index: true,
      },
      concurrency_stamp: {
        type: DataTypes.UUID,
        unique: true,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.UUID,
      },
      updated_by: {
        type: DataTypes.UUID,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  )

  product.associate = (models) => {
    product.hasOne(models.category, {
      foreignKey: 'public_id',
      sourceKey: 'category_id',
      as: 'category',
    })
    product.hasOne(models.subCategory, {
      foreignKey: 'public_id',
      sourceKey: 'sub_category_id',
      as: 'subCategory',
    })
  }

  return product
}
