const { ORDER_STATUS, ORDER_STATUS_ENUM } = require('../../utils/constants/orderStatusConstants');
const { REFUND_STATUS, REFUND_STATUS_ENUM } = require('../../utils/constants/refundStatusConstants');
const { PAYMENT_STATUS, PAYMENT_STATUS_ENUM } = require('../../utils/constants/paymentStatusConstants');

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
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      discount_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      shipping_charges: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      final_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      order_priority: {
        type: DataTypes.STRING,
        enum: [ 'NORMAL', 'EXPRESS', 'URGENT' ],
        defaultValue: 'NORMAL',
        allowNull: false,
      },
      estimated_delivery_time: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated delivery time in minutes',
      },
      distance: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Distance in kilometers, from road-distance API or Haversine fallback',
      },
      distance_method: {
        type: DataTypes.STRING,
        enum: [ 'ROAD_API', 'HAVERSINE_FALLBACK', 'MANUAL' ],
        allowNull: true,
      },
      estimated_delivery_eta: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated delivery time in minutes, from road-distance API',
      },
      refund_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      refund_status: {
        type: DataTypes.STRING,
        enum: REFUND_STATUS_ENUM,
        defaultValue: REFUND_STATUS.NONE,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        enum: ORDER_STATUS_ENUM,
        defaultValue: ORDER_STATUS.PENDING,
        allowNull: false,
      },
      payment_status: {
        type: DataTypes.STRING,
        enum: PAYMENT_STATUS_ENUM,
        allowNull: false,
        defaultValue: PAYMENT_STATUS.UNPAID,
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
      order_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        index: true,
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
    order.hasMany(models.inventoryMovement, {
      foreignKey: 'reference_id',
      sourceKey: 'id',
      as: 'inventoryMovements',
      constraints: false,
      scope: {
        reference_type: 'ORDER',
      },
    });
  };

  return order;
};
