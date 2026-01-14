module.exports = (sequelize, DataTypes) => {
  const userFcmToken = sequelize.define(
    'user_fcm_token',
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
          fields: [ 'user_id', 'status' ],
          name: 'idx_user_status',
        },
      ],
    },
  );

  userFcmToken.associate = (models) => {
    userFcmToken.belongsTo(models.user, {
      foreignKey: 'user_id',
      targetKey: 'id',
      as: 'user',
    });
  };

  return userFcmToken;
};

