module.exports = (sequelize, DataTypes) => {
  const notification = sequelize.define(
    'notification',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true,
        comment: 'Type of notification: ORDER_PLACED, ORDER_UPDATED, USER_LOGIN, etc.',
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Notification title',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Notification message',
      },
      recipient_type: {
        type: DataTypes.STRING,
        allowNull: false,
        enum: [ 'USER', 'VENDOR', 'BRANCH', 'ADMIN', 'ALL' ],
        index: true,
        comment: 'Who should receive this notification',
      },
      recipient_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
        comment: 'Specific recipient ID (user_id, vendor_id, branch_id, etc.)',
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
        comment: 'Vendor ID for vendor-specific notifications',
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
        comment: 'Branch ID for branch-specific notifications',
      },
      entity_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Type of entity this notification relates to (ORDER, USER, etc.)',
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
        comment: 'ID of the entity this notification relates to (order_id, user_id, etc.)',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional dynamic data in JSON format for flexible storage',
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        index: true,
        comment: 'Whether the notification has been read',
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when notification was read',
      },
      priority: {
        type: DataTypes.STRING,
        enum: [ 'LOW', 'MEDIUM', 'HIGH', 'URGENT' ],
        defaultValue: 'MEDIUM',
        allowNull: false,
        index: true,
        comment: 'Notification priority level',
      },
      status: {
        type: DataTypes.STRING,
        enum: [ 'ACTIVE', 'ARCHIVED', 'DELETED' ],
        defaultValue: 'ACTIVE',
        allowNull: false,
        index: true,
        comment: 'Notification status',
      },
      action_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to navigate when notification is clicked',
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Icon name or URL for the notification',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User/system that created the notification',
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      indexes: [
        {
          fields: [ 'recipient_type', 'recipient_id', 'is_read' ],
        },
        {
          fields: [ 'vendor_id', 'status', 'created_at' ],
        },
        {
          fields: [ 'type', 'status', 'created_at' ],
        },
      ],
    },
  );

  notification.associate = (models) => {
    notification.belongsTo(models.user, {
      foreignKey: 'recipient_id',
      targetKey: 'id',
      as: 'recipient',
      constraints: false,
    });
    notification.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
      constraints: false,
    });
    notification.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
      constraints: false,
    });
    notification.belongsTo(models.order, {
      foreignKey: 'entity_id',
      targetKey: 'id',
      as: 'order',
      constraints: false,
    });
    notification.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'creator',
      constraints: false,
    });
  };

  return notification;
};
