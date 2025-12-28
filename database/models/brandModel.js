module.exports = (sequelize, DataTypes) => {
  const brand = sequelize.define(
    'brand',
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
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      logo: {
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

  brand.associate = (models) => {
    brand.hasMany(models.product, {
      foreignKey: 'brand_id',
      sourceKey: 'id',
      as: 'products',
    });
    brand.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
    brand.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
    });
    brand.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
  };

  return brand;
};

