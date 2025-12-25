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

  user.associate = (models) => {
    // Mapping table relationship
    user.hasMany(models.user_roles_mappings, {
      foreignKey: 'user_id',
      sourceKey: 'id',
      as: 'roleMappings',
    })
    // Relationships for tables that reference user
    user.hasMany(models.address, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'addresses',
    })
    user.hasMany(models.cart, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'cartItems',
    })
    user.hasMany(models.wishlist, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'wishlistItems',
    })
    user.hasMany(models.order, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'orders',
    })
    user.hasMany(models.order, {
      foreignKey: 'rider_id',
      sourceKey: 'id',
      as: 'riderOrders',
    })
    user.hasMany(models.orderItem, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'orderItems',
    })
    user.hasMany(models.otp, {
      foreignKey: 'user_id',
      sourceKey: 'id',
      as: 'otps',
    })
    user.hasMany(models.category, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'createdCategories',
    })
    user.hasMany(models.product, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'createdProducts',
    })
    user.hasMany(models.vendor, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'createdVendors',
    })
    user.hasMany(models.promocode, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'createdPromocodes',
    })
    user.hasMany(models.offer, {
      foreignKey: 'created_by',
      sourceKey: 'id',
      as: 'createdOffers',
    })
  }

  return user
}
