module.exports = (sequelize, DataTypes) => {
  const userRolesMapping = sequelize.define(
    'user_roles_mappings',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Made optional
        index: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      role_id: {
        type: DataTypes.INTEGER,
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
    }
  )

  userRolesMapping.associate = (models) => {
    userRolesMapping.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
      required: false, // Optional relationship
    })
    userRolesMapping.belongsTo(models.user, {
      foreignKey: 'user_id',
      targetKey: 'id',
      as: 'user',
    })
    userRolesMapping.belongsTo(models.role, {
      foreignKey: 'role_id',
      targetKey: 'id',
      as: 'role',
    })
  }

  return userRolesMapping
}

