module.exports = (sequelize, DataTypes) => {
  const banner = sequelize.define(
    'banner',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true,
        comment: 'Optional link to subcategory',
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL of the banner image',
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order in which banner should be displayed',
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
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    },
  );

  banner.associate = (models) => {
    banner.belongsTo(models.vendor, {
      foreignKey: 'vendor_id',
      targetKey: 'id',
      as: 'vendor',
    });
    banner.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
    banner.belongsTo(models.subCategory, {
      foreignKey: 'sub_category_id',
      targetKey: 'id',
      as: 'subCategory',
      required: false,
    });
    banner.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
  };

  return banner;
};
