const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VoteParticipant extends Model {
    static associate(models) {
      VoteParticipant.belongsTo(models.VoteSession, { foreignKey: 'vote_session_id', as: 'session' });
      VoteParticipant.hasMany(models.VoteCast, { foreignKey: 'participant_id', as: 'casts' });
    }
  }
  VoteParticipant.init({
    vote_session_id: DataTypes.UUID,
    display_name: DataTypes.STRING,
    joined_at: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'VoteParticipant',
  });
  return VoteParticipant;
};
