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
      public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true,
        unique: true,
      },
      house_no: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      street_details: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      landmark: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mobile_number: {
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

  address.associate = (models) => {
    address.hasOne(models.user, {
      foreignKey: 'public_id',
      sourceKey: 'created_by',
      as: 'user',
    })
  }

  return address
}
