module.exports = (sequelize, DataTypes) => {
  const wishlist = sequelize.define(
    'wishlist',
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
      product_id: {
        type: DataTypes.UUID,
        allowNull: false,
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

  wishlist.associate = (models) => {
    wishlist.hasOne(models.product, {
      foreignKey: 'public_id',
      sourceKey: 'product_id',
      as: 'productDetails',
    })
  }

  return wishlist
}
