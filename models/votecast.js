const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VoteCast extends Model {
    static associate(models) {
      VoteCast.belongsTo(models.VoteSession, { foreignKey: 'vote_session_id', as: 'session' });
      VoteCast.belongsTo(models.VoteParticipant, { foreignKey: 'participant_id', as: 'participant' });
    }
  }
  VoteCast.init({
    vote_session_id: DataTypes.UUID,
    participant_id: DataTypes.UUID,
    phase: DataTypes.STRING,
    watchable_id: DataTypes.INTEGER,
    vote: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'VoteCast',
  });
  return VoteCast;
};
