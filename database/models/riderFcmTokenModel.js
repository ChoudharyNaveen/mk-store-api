module.exports = (sequelize, DataTypes) => {
  const riderFcmToken = sequelize.define(
    'rider_fcm_token',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      fcm_token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        index: true,
      },
      total_orders: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
      },
      status: {
        type: DataTypes.STRING,
        enum: [ 'ACTIVE', 'INACTIVE' ],
        defaultValue: 'ACTIVE',
        index: true,
      },
      device_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Device type: android, ios, web',
      },
      device_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Unique device identifier',
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      indexes: [
        {
          fields: [ 'vendor_id', 'branch_id', 'status' ],
          name: 'idx_vendor_branch_status',
        },
      ],
    },
  );

  riderFcmToken.associate = (models) => {
    // Relationship with user
    riderFcmToken.belongsTo(models.user, {
      foreignKey: 'user_id',
      targetKey: 'id',
      as: 'user',
    });

    // Relationship with vendor
    riderFcmToken.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
    });

    // Relationship with branch
    riderFcmToken.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
  };

  return riderFcmToken;
};
