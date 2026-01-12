module.exports = (sequelize, DataTypes) => {
  const branch = sequelize.define(
    'branch',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        index: true,
      },
      address_line1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address_line2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      street: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true,
        index: true,
      },
      pincode: {
        type: DataTypes.STRING,
        allowNull: true,
        index: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        enum: [ 'ACTIVE', 'INACTIVE' ],
        defaultValue: 'ACTIVE',
        index: true,
      },
      concurrency_stamp: {
        type: DataTypes.UUID,
        unique: true,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    },
  );

  branch.associate = (models) => {
    branch.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
    });
    branch.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
    branch.hasMany(models.category, {
      foreignKey: 'branch_id',
      sourceKey: 'id',
      as: 'categories',
    });
    branch.hasMany(models.product, {
      foreignKey: 'branch_id',
      sourceKey: 'id',
      as: 'products',
    });
    branch.hasMany(models.order, {
      foreignKey: 'branch_id',
      sourceKey: 'id',
      as: 'orders',
    });
    branch.hasOne(models.branchShippingConfig, {
      foreignKey: 'branch_id',
      sourceKey: 'id',
      as: 'shippingConfig',
    });
    branch.hasMany(models.roadDistanceCache, {
      foreignKey: 'branch_id',
      sourceKey: 'id',
      as: 'distanceCache',
    });
  };

  return branch;
};
