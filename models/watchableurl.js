const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WatchableUrl extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      models.WatchableUrl.belongsTo(models.Watchable, { foreignKey: 'watchable_id' });
    }
  }
  WatchableUrl.init({
    url: DataTypes.STRING,
    service_type: DataTypes.STRING,
    custom: DataTypes.BOOLEAN,
    provider_id: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'WatchableUrl',
  });
  return WatchableUrl;
};
