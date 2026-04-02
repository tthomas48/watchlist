/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserStreamingAccess', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      country: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'us',
      },
      directServiceIds: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '[]',
      },
      addonsByHost: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '{}',
      },
      receiversEnabled: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '{}',
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

    await queryInterface.addColumn('Watchables', 'streaming_service_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Watchables', 'streaming_addon_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.dropTable('Providers');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Watchables', 'streaming_service_id');
    await queryInterface.removeColumn('Watchables', 'streaming_addon_id');
    await queryInterface.dropTable('UserStreamingAccess');

    await queryInterface.createTable('Providers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: { type: Sequelize.STRING },
      url: { type: Sequelize.STRING },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },
};
