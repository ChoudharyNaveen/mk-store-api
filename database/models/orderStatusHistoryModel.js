module.exports = (sequelize, DataTypes) => {
  const orderStatusHistory = sequelize.define(
    'orderStatusHistory',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      status: {
        type: DataTypes.STRING,
        enum: [ 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED' ],
        allowNull: false,
      },
      previous_status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      changed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'order_status_history',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    },
  );

  orderStatusHistory.associate = (models) => {
    orderStatusHistory.belongsTo(models.order, {
      foreignKey: 'order_id',
      targetKey: 'id',
      as: 'order',
    });
    orderStatusHistory.belongsTo(models.user, {
      foreignKey: 'changed_by',
      targetKey: 'id',
      as: 'changedByUser',
    });
  };

  return orderStatusHistory;
};

