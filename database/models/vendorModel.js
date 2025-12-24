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
      public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
        unique: true,
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
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        enum: ['ACTIVE', 'INACTIVE'],
        defaultValue: 'ACTIVE',
        index: true,
      },
      concurrency_stamp: {
        type: DataTypes.UUID,
        unique: true,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.UUID,
      },
      updated_by: {
        type: DataTypes.UUID,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  )

  vendor.associate = (models) => {
    vendor.hasMany(models.branch, {
      foreignKey: 'vendor_id',
      sourceKey: 'public_id',
      as: 'branches',
    })
    vendor.hasMany(models.user, {
      foreignKey: 'vendor_id',
      sourceKey: 'public_id',
      as: 'users',
    })
    // Mapping table relationships
    vendor.hasMany(models.vendor_user, {
      foreignKey: 'vendor_id',
      sourceKey: 'public_id',
      as: 'vendorUsers',
    })
    vendor.hasMany(models.category, {
      foreignKey: 'vendor_id',
      sourceKey: 'public_id',
      as: 'categories',
    })
    vendor.hasMany(models.product, {
      foreignKey: 'vendor_id',
      sourceKey: 'public_id',
      as: 'products',
    })
  }

  return vendor
}

