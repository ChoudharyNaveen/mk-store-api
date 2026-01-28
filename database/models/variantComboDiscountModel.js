module.exports = (sequelize, DataTypes) => {
  const variantComboDiscount = sequelize.define(
    'variantComboDiscount',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      combo_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Exact quantity required for combo discount',
      },
      discount_type: {
        type: DataTypes.STRING,
        allowNull: false,
        enum: [ 'PERCENT', 'FLATOFF' ],
      },
      discount_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Percentage if type is PERCENT, or offer_id if type is OFFER',
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATE,
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
      tableName: 'variant_combo_discount',
    },
  );

  variantComboDiscount.associate = (models) => {
    variantComboDiscount.belongsTo(models.productVariant, {
      foreignKey: 'variant_id',
      targetKey: 'id',
      as: 'variant',
    });
    variantComboDiscount.belongsTo(models.offer, {
      foreignKey: 'discount_value',
      targetKey: 'id',
      as: 'offer',
      constraints: false,
    });
    variantComboDiscount.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdByUser',
    });
    variantComboDiscount.belongsTo(models.user, {
      foreignKey: 'updated_by',
      targetKey: 'id',
      as: 'updatedByUser',
    });
  };

  return variantComboDiscount;
};
