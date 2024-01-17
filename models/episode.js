const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Episode extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      models.Episode.belongsTo(models.Watchable, { foreignKey: 'watchable_id' });
    }
  }
  Episode.init({
    trakt_id: DataTypes.STRING,
    title: DataTypes.STRING,
    overview: DataTypes.STRING,
    season: DataTypes.NUMERIC,
    episode: DataTypes.NUMERIC,
  }, {
    sequelize,
    modelName: 'Episode',
  });
  return Episode;
};
