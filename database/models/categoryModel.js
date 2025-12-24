module.exports = (sequelize, DataTypes) => {
  const category = sequelize.define(
    'category',
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
      branch_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
      },
      vendor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: false,
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
  category.associate = (models) => {
    category.hasMany(models.product, {
      foreignKey: 'category_id',
      sourceKey: 'public_id',
      as: 'products',
    })
    category.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'public_id',
      as: 'branch',
    })
    category.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'public_id',
      as: 'vendor',
    })
  }

  return category
}
