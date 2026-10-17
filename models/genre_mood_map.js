const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GenreMoodMap extends Model {
    static associate(models) {
      GenreMoodMap.belongsTo(models.Genre, { foreignKey: 'genre_id', as: 'genre' });
      GenreMoodMap.belongsTo(models.Mood, { foreignKey: 'mood_id', as: 'mood' });
    }
  }
  GenreMoodMap.init({
    genre_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mood_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'GenreMoodMap',
    tableName: 'GenreMoodMaps',
  });
  return GenreMoodMap;
};
