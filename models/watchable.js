const debug = require('debug')('watchlist:models:watchable');
const {
  Model,
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
      const assocs = Object.keys(models.Watchable.associations);
      for (let i = 0; i < assocs.length; i += 1) {
        const assoc = assocs[i];
        for (let j = 0; j < assocs.length; j += 1) {
          debug(`${models.Watchable.name}.${models.Watchable.associations[assoc].accessors[assocs[j]]}()`);
        }
      }
    }
  }
  Watchable.init({
    title: DataTypes.STRING,
    sortable_title: DataTypes.STRING,
    trakt_id: DataTypes.STRING,
    trakt_list_id: DataTypes.STRING,
    justwatch_id: DataTypes.STRING,
    imdb_id: DataTypes.INTEGER,
    tmdb_id: DataTypes.INTEGER,
    image: DataTypes.STRING,
    media_type: DataTypes.STRING,
    last_played: DataTypes.DATE,
    comment: DataTypes.TEXT,
    hidden: DataTypes.BOOLEAN,
    local: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Watchable',
  });
  Watchable.beforeCreate(async (user) => {
    user.sortable_title = user.title.toLowerCase().replace(/^(the|a|an) /, '');
  });
  Watchable.beforeUpdate(async (user) => {
    user.sortable_title = user.title.toLowerCase().replace(/^(the|a|an) /, '');
  });
  return Watchable;
};
