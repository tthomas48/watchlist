const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VoteSession extends Model {
    static associate(models) {
      VoteSession.belongsTo(models.User, { foreignKey: 'host_user_id', as: 'host' });
      VoteSession.belongsTo(models.Watchable, { foreignKey: 'current_watchable_id', as: 'currentWatchable' });
      VoteSession.belongsTo(models.Watchable, { foreignKey: 'winner_watchable_id', as: 'winnerWatchable' });
      VoteSession.hasMany(models.VoteParticipant, { foreignKey: 'vote_session_id', as: 'participants' });
      VoteSession.hasMany(models.VoteCast, { foreignKey: 'vote_session_id', as: 'casts' });
    }
  }
  VoteSession.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: DataTypes.STRING(8),
    trakt_list_id: DataTypes.STRING,
    trakt_list_user_slug: DataTypes.STRING,
    host_user_id: DataTypes.INTEGER,
    status: DataTypes.STRING,
    phase: DataTypes.STRING,
    service_type: DataTypes.STRING,
    current_watchable_id: DataTypes.INTEGER,
    finalist_ids: DataTypes.JSON,
    excluded_ids: DataTypes.JSON,
    pool_ids: DataTypes.JSON,
    winner_watchable_id: DataTypes.INTEGER,
    expires_at: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'VoteSession',
  });
  return VoteSession;
};
