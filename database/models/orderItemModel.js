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
      public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
        unique: true,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      product_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price_at_purchase: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      concurrency_stamp: {
        type: DataTypes.UUID,
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

  orderItem.associate = (models) => {
    orderItem.hasOne(models.order, {
      foreignKey: 'public_id',
      sourceKey: 'order_id',
      as: 'order',
    })
     orderItem.hasOne(models.user, {
      foreignKey: 'public_id',
      sourceKey: 'created_by',
      as: 'user',
    })
    orderItem.hasOne(models.product, {
      foreignKey: 'public_id',
      sourceKey: 'product_id',
      as: 'product',
    })
 }

  return orderItem
}
