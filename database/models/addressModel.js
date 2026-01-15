module.exports = (sequelize, DataTypes) => {
  const address = sequelize.define(
    'address',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      address_line_1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address_line_2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      street: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      landmark: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true,
        index: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'India',
      },
      pincode: {
        type: DataTypes.STRING,
        allowNull: true,
        index: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mobile_number: {
        type: DataTypes.STRING,
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

  address.associate = (models) => {
    address.belongsTo(models.user, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'user',
    });
    address.hasMany(models.order, {
      foreignKey: 'address_id',
      sourceKey: 'id',
      as: 'orders',
    });
  };

  return address;
};
