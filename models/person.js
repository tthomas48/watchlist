const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Person extends Model {
    static associate(models) {
      Person.belongsTo(models.User, { foreignKey: 'userId' });
      Person.belongsToMany(models.Watchable, {
        through: models.WatchablePerson,
        foreignKey: 'personId',
        otherKey: 'watchableId',
        as: 'watchables',
      });
    }
  }
  Person.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Person',
    tableName: 'People',
  });
  return Person;
};
