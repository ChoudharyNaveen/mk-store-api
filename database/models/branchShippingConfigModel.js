module.exports = (sequelize, DataTypes) => {
  const branchShippingConfig = sequelize.define(
    'branchShippingConfig',
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
        unique: true,
        index: true,
      },
      distance_threshold_km: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 3.0,
        comment: 'Configurable distance threshold in kilometers (default: 3km)',
      },
      within_threshold_base_charge: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 20.0,
        comment: 'Base shipping charge for orders within threshold distance',
      },
      within_threshold_free_above: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 199.0,
        comment: 'Order amount above which shipping is free within threshold distance',
      },
      above_threshold_sameday_base_charge: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 120.0,
        comment: 'Base shipping charge for same-day delivery above threshold distance',
      },
      above_threshold_sameday_discounted_charge: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 50.0,
        comment: 'Discounted shipping charge for same-day delivery above threshold (for orders above discount threshold)',
      },
      above_threshold_sameday_free_above: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 399.0,
        comment: 'Order amount above which same-day shipping is free above threshold distance',
      },
      above_threshold_nextday_base_charge: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 50.0,
        comment: 'Base shipping charge for next-day delivery above threshold distance',
      },
      above_threshold_nextday_free_above: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 399.0,
        comment: 'Order amount above which next-day shipping is free above threshold distance',
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
      tableName: 'branch_shipping_config',
    },
  );

  branchShippingConfig.associate = (models) => {
    branchShippingConfig.belongsTo(models.branch, {
      foreignKey: 'branch_id',
      targetKey: 'id',
      as: 'branch',
    });
    branchShippingConfig.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
    branchShippingConfig.belongsTo(models.user, {
      foreignKey: 'updated_by',
      targetKey: 'id',
      as: 'updatedByUser',
    });
  };

  return branchShippingConfig;
};
