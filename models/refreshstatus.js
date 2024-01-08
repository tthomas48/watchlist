const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RefreshStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  RefreshStatus.init({
    lastRefresh: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'RefreshStatus',
  });
  return RefreshStatus;
};
