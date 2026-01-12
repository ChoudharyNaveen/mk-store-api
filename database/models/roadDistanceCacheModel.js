module.exports = (sequelize, DataTypes) => {
  const roadDistanceCache = sequelize.define(
    'roadDistanceCache',
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
      address_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      address_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
      },
      distance: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Distance in kilometers',
      },
      eta: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated delivery time in minutes',
      },
      distance_method: {
        type: DataTypes.STRING,
        enum: [ 'ROAD_API', 'HAVERSINE_FALLBACK' ],
        defaultValue: 'ROAD_API',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        index: true,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false,
      tableName: 'road_distance_cache',
      indexes: [
        {
          unique: true,
          fields: [ 'branch_id', 'address_latitude', 'address_longitude' ],
          name: 'unique_branch_address',
        },
      ],
    },
  );

  roadDistanceCache.associate = (models) => {
    roadDistanceCache.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
  };

  return roadDistanceCache;
};
