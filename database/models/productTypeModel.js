module.exports = (sequelize, DataTypes) => {
  const productType = sequelize.define(
    'productType',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
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
      tableName: 'product_type',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: [ 'sub_category_id', 'title' ],
        },
      ],
    },
  );

  productType.associate = (models) => {
    productType.belongsTo(models.subCategory, {
      foreignKey: 'sub_category_id',
      targetKey: 'id',
      as: 'subCategory',
    });
    productType.hasMany(models.product, {
      foreignKey: 'product_type_id',
      sourceKey: 'id',
      as: 'products',
    });
    productType.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
  };

  return productType;
};
