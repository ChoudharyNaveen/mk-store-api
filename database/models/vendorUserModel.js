module.exports = (sequelize, DataTypes) => {
  const vendorUser = sequelize.define(
    'vendor_user',
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
      vendor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
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

  vendorUser.associate = (models) => {
    vendorUser.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'public_id',
      as: 'vendor',
    })
    vendorUser.belongsTo(models.user, {
      foreignKey: 'user_id',
      targetKey: 'public_id',
      as: 'user',
    })
    vendorUser.belongsTo(models.role, {
      foreignKey: 'role_id',
      targetKey: 'public_id',
      as: 'role',
    })
  }

  return vendorUser
}

