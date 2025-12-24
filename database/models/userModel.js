module.exports = (sequelize, DataTypes) => {
  const user = sequelize.define(
    'user',
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
        allowNull: true,
      },
      mobile_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      vendor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        index: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      gender: {
        type: DataTypes.STRING,
        enum: ['MALE', 'FEMALE'],
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        enum: ['ACTIVE', 'INACTIVE'],
        defaultValue: 'ACTIVE',
        index: true,
      },
      profile_status: {
        type: DataTypes.STRING,
        enum: ['INCOMPLETE', 'COMPLETE'],
        defaultValue: 'INCOMPLETE',
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

  user.associate = (models) => {
    user.hasOne(models.role, {
      foreignKey: 'public_id',
      sourceKey: 'role_id',
      as: 'role',
    })
    user.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'public_id',
      as: 'vendor',
    })
    // Mapping table relationship
    user.hasMany(models.vendor_user, {
      foreignKey: 'user_id',
      sourceKey: 'public_id',
      as: 'vendorMappings',
    })
  }

  return user
}
