module.exports = (sequelize, DataTypes) => {
  const vendor = sequelize.define(
    'vendor',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      mobile_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        index: true,
      },
      address: {
        type: DataTypes.TEXT,
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

  vendor.associate = (models) => {
    vendor.hasMany(models.branch, {
      foreignKey: 'vendor_id',
      sourceKey: 'id',
      as: 'branches',
    });
    // Mapping table relationships
    vendor.hasMany(models.user_roles_mappings, {
      foreignKey: 'vendor_id',
      sourceKey: 'id',
      as: 'userRoleMappings',
    });
    vendor.hasMany(models.category, {
      foreignKey: 'vendor_id',
      sourceKey: 'id',
      as: 'categories',
    });
    vendor.hasMany(models.product, {
      foreignKey: 'vendor_id',
      sourceKey: 'id',
      as: 'products',
    });
    vendor.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
  };

  return vendor;
};
