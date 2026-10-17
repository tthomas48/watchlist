const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Mood extends Model {
    static associate(models) {
      Mood.belongsToMany(models.Genre, {
        through: models.GenreMoodMap,
        foreignKey: 'mood_id',
        otherKey: 'genre_id',
        as: 'genres',
      });
      Mood.hasMany(models.GenreMoodMap, {
        foreignKey: 'mood_id',
        as: 'genreMaps',
      });
    }
  }
  Mood.init({
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'Mood',
    tableName: 'Moods',
  });
  return Mood;
};
