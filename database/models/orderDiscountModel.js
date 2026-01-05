module.exports = (sequelize, DataTypes) => {
  const orderDiscount = sequelize.define(
    'orderDiscount',
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
      discount_type: {
        type: DataTypes.STRING,
        enum: [ 'OFFER', 'PROMOCODE' ],
        allowNull: false,
      },
      offer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      promocode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      discount_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      discount_percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      original_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      final_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      concurrency_stamp: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
      },
    },
    {
      tableName: 'order_discount',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    },
  );

  orderDiscount.associate = (models) => {
    orderDiscount.belongsTo(models.order, {
      foreignKey: 'order_id',
      targetKey: 'id',
      as: 'order',
    });
    orderDiscount.belongsTo(models.offer, {
      foreignKey: 'offer_id',
      targetKey: 'id',
      as: 'offer',
    });
    orderDiscount.belongsTo(models.promocode, {
      foreignKey: 'promocode_id',
      targetKey: 'id',
      as: 'promocode',
    });
  };

  return orderDiscount;
};

