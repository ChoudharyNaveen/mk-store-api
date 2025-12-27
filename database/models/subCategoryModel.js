module.exports = (sequelize, DataTypes) => {
  const subCategory = sequelize.define(
    'subCategory',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
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
      category_id: {
        type: DataTypes.INTEGER,
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

  subCategory.associate = (models) => {
    subCategory.belongsTo(models.category, {
      foreignKey: 'category_id',
      targetKey: 'id',
      as: 'category',
    });
    subCategory.hasMany(models.product, {
      foreignKey: 'sub_category_id',
      sourceKey: 'id',
      as: 'products',
    });
  };

  return subCategory;
};
