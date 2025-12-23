module.exports = (sequelize, DataTypes) => {
  const order = sequelize.define(
    'order',
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
        unique: true,
      },
      total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
        defaultValue: 'PENDING',
        allowNull: false,
      },
      payment_status: {
        type: DataTypes.STRING,
        enum: ['PAID', 'UNPAID', 'FAILED'],
        allowNull: false,
        defaultValue: 'UNPAID',
      },
      pickup_status: {
        type: DataTypes.STRING,
        enum: ['OPEN', 'ACCEPT'],
        allowNull: true,
        defaultValue: 'OPEN',
      },
      rider_id:{
        type:DataTypes.UUID,
        allowNull: true
      },
      address_id: {
        type: DataTypes.UUID,
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

  order.associate = (models) => {
    order.hasOne(models.user, {
      foreignKey: 'public_id',
      sourceKey: 'created_by',
      as: 'user',
    })
    order.hasOne(models.address, {
      foreignKey: 'public_id',
      sourceKey: 'address_id',
      as: 'address',
    })
    order.hasOne(models.user, {
      foreignKey: 'public_id',
      sourceKey: 'rider_id',
      as: 'riderDetails',
    })
  }

  return order
}
