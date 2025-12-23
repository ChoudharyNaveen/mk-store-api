module.exports = (sequelize, DataTypes) => {
  const role = sequelize.define(
    'role',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      public_id: { type: DataTypes.UUID, unique: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.STRING, allowNull: false },
      created_by: { type: DataTypes.UUID },
      updated_by: { type: DataTypes.UUID },
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
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  )

  return role
}
