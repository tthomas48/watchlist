const {
  Model,
  QueryTypes,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Watchable extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      models.Watchable.hasMany(models.Episode, {
        as: 'episodes', foreignKey: 'watchable_id', onDelete: 'CASCADE', type: DataTypes.INTEGER,
      });
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
    web_url: DataTypes.STRING,
    homepage: DataTypes.STRING,
    noautoadvance: DataTypes.BOOLEAN,
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
  Watchable.prototype.getNextUnwatchedId = async function getNextUnwatchedId() {
    const nextUnwatched = await sequelize.query('select trakt_id from episodes where watchable_id = :id and coalesce(watched, 0) = 0 order by season, episode limit 1;', {
      replacements: { id: this.id },
      type: QueryTypes.SELECT,
    });
    if (nextUnwatched.length === 0) {
      return null;
    }
    return nextUnwatched[0].trakt_id;
  };
  return Watchable;
};
