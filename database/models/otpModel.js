module.exports = (sequelize, DataTypes) => {
  const otp = sequelize.define(
    'otp',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      type: {
        type: DataTypes.STRING,
        defaultValue: 'user-registration',
        allowNull: false,
        index: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        index: true,
      },
      mobile_number: {
        type: DataTypes.STRING,
        allowNull: true,
        index: true,
      },
      otp: { type: DataTypes.STRING, allowNull: false },
      text: { type: DataTypes.STRING, allowNull: true },
      validity: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.STRING,
        enum: ['ACTIVE', 'INACTIVE'],
        defaultValue: 'ACTIVE',
        index: true,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  )

  otp.associate = (models) => {
    otp.hasOne(models.user, {
      foreignKey: 'public_id',
      sourceKey: 'user_id',
    })
  }

  return otp
}
