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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
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

  branch.associate = (models) => {
    branch.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'public_id',
      as: 'vendor',
    })
    branch.hasMany(models.category, {
      foreignKey: 'branch_id',
      sourceKey: 'public_id',
      as: 'categories',
    })
    branch.hasMany(models.product, {
      foreignKey: 'branch_id',
      sourceKey: 'public_id',
      as: 'products',
    })
    branch.hasMany(models.order, {
      foreignKey: 'branch_id',
      sourceKey: 'public_id',
      as: 'orders',
    })
  }

  return branch
}

