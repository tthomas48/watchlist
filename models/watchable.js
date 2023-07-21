'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Watchable extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      models.Watchable.hasMany(models.WatchableUrl, { as: 'urls', foreignKey: 'watchable_id', onDelete: 'CASCADE' });
    }
  }
  Watchable.init({
    title: DataTypes.STRING,
    trakt_id: DataTypes.STRING,
    trakt_list_id: DataTypes.STRING,
    justwatch_id: DataTypes.STRING,
    image: DataTypes.STRING,
    media_type: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Watchable',
  });
  return Watchable;
};