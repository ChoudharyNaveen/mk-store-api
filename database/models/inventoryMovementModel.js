module.exports = (sequelize, DataTypes) => {
  const inventoryMovement = sequelize.define(
    'inventoryMovement',
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
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      movement_type: {
        type: DataTypes.STRING,
        enum: [ 'ADDED', 'REMOVED', 'ADJUSTED', 'REVERTED' ],
        allowNull: false,
        index: true,
      },
      quantity_change: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Positive for ADDED/REVERTED, negative for REMOVED',
      },
      quantity_before: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity_after: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reference_type: {
        type: DataTypes.STRING,
        enum: [ 'PRODUCT', 'ORDER', 'MANUAL' ],
        allowNull: true,
      },
      reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'order_id if order-related, product_id if product-related',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Who made the change',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false,
      tableName: 'inventory_movement',
      indexes: [
        {
          fields: [ 'created_at' ],
        },
        {
          fields: [ 'reference_type', 'reference_id' ],
        },
      ],
    },
  );

  inventoryMovement.associate = (models) => {
    inventoryMovement.belongsTo(models.product, {
      foreignKey: 'product_id',
      targetKey: 'id',
      as: 'product',
    });
    inventoryMovement.belongsTo(models.productVariant, {
      foreignKey: 'variant_id',
      targetKey: 'id',
      as: 'variant',
    });
    inventoryMovement.belongsTo(models.order, {
      foreignKey: 'reference_id',
      targetKey: 'id',
      as: 'order',
      constraints: false,
      scope: {
        reference_type: 'ORDER',
      },
    });
    inventoryMovement.belongsTo(models.user, {
      foreignKey: 'user_id',
      targetKey: 'id',
      as: 'user',
    });
    // Note: vendor and branch are stored as IDs, not foreign keys
    // Associations would require adding foreign keys or joining separately
  };

  return inventoryMovement;
};
