const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      models.Notification.belongsTo(models.Watchable, { foreignKey: 'watchable_id' });
    }
  }
  Notification.init({
    message: DataTypes.STRING,
    trakt_list_id: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Notification',
  });
  return Notification;
};
