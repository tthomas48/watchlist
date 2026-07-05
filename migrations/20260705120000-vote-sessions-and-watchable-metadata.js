/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'overview', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Watchables', 'year', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('Watchables', 'rogerebert_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.createTable('VoteSessions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      code: {
        type: Sequelize.STRING(8),
        allowNull: false,
        unique: true,
      },
      trakt_list_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      trakt_list_user_slug: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      host_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'lobby',
      },
      phase: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      service_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'adb-googletv',
      },
      current_watchable_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Watchables', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      finalist_ids: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]',
      },
      excluded_ids: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]',
      },
      pool_ids: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]',
      },
      winner_watchable_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Watchables', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('VoteSessions', ['code'], { unique: true });

    await queryInterface.createTable('VoteParticipants', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      vote_session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'VoteSessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      display_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable('VoteCasts', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      vote_session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'VoteSessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      participant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'VoteParticipants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phase: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      watchable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vote: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('VoteCasts', ['vote_session_id', 'participant_id', 'phase', 'watchable_id'], {
      unique: true,
      name: 'vote_casts_unique_per_item',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('VoteCasts');
    await queryInterface.dropTable('VoteParticipants');
    await queryInterface.dropTable('VoteSessions');
    await queryInterface.removeColumn('Watchables', 'rogerebert_url');
    await queryInterface.removeColumn('Watchables', 'year');
    await queryInterface.removeColumn('Watchables', 'overview');
  },
};
