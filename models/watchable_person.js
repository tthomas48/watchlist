const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WatchablePerson extends Model {
    static associate(models) {
      WatchablePerson.belongsTo(models.Watchable, { foreignKey: 'watchableId' });
      WatchablePerson.belongsTo(models.Person, { foreignKey: 'personId' });
    }
  }
  WatchablePerson.init({
    watchableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    personId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'WatchablePerson',
    tableName: 'WatchablePeople',
  });
  return WatchablePerson;
};
