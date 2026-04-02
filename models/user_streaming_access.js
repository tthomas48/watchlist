const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserStreamingAccess extends Model {
    static associate(models) {
      UserStreamingAccess.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  UserStreamingAccess.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'us',
    },
    directServiceIds: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
    },
    addonsByHost: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{}',
    },
    receiversEnabled: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{}',
    },
  }, {
    sequelize,
    modelName: 'UserStreamingAccess',
    tableName: 'UserStreamingAccess',
  });
  return UserStreamingAccess;
};
