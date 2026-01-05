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
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        enum: [ 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED' ],
        defaultValue: 'PENDING',
        allowNull: false,
      },
      payment_status: {
        type: DataTypes.STRING,
        enum: [ 'PAID', 'UNPAID', 'FAILED' ],
        allowNull: false,
        defaultValue: 'UNPAID',
      },
      pickup_status: {
        type: DataTypes.STRING,
        enum: [ 'OPEN', 'ACCEPT' ],
        allowNull: true,
        defaultValue: 'OPEN',
      },
      rider_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      address_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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

  order.associate = (models) => {
    order.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'user',
    });
    order.belongsTo(models.address, {
      foreignKey: 'address_id',
      targetKey: 'id',
      as: 'address',
    });
    order.belongsTo(models.user, {
      foreignKey: 'rider_id',
      targetKey: 'id',
      as: 'riderDetails',
    });
    order.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
    order.hasMany(models.orderItem, {
      foreignKey: 'order_id',
      sourceKey: 'id',
      as: 'orderItems',
    });
    order.hasMany(models.orderDiscount, {
      foreignKey: 'order_id',
      sourceKey: 'id',
      as: 'orderDiscount',
    });
    order.hasMany(models.orderStatusHistory, {
      foreignKey: 'order_id',
      sourceKey: 'id',
      as: 'orderStatusHistory',
    });
  };

  return order;
};
