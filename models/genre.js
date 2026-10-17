const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Genre extends Model {
    static associate(models) {
      Genre.belongsToMany(models.Mood, {
        through: models.GenreMoodMap,
        foreignKey: 'genre_id',
        otherKey: 'mood_id',
        as: 'moods',
      });
      Genre.hasMany(models.GenreMoodMap, {
        foreignKey: 'genre_id',
        as: 'moodMaps',
      });
    }
  }
  Genre.init({
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Genre',
    tableName: 'Genres',
  });
  return Genre;
};
