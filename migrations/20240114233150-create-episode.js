/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Episodes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      watchable_id: {
        type: Sequelize.STRING,
      },
      trakt_id: {
        type: Sequelize.STRING,
      },
      title: {
        type: Sequelize.STRING,
      },
      overview: {
        type: Sequelize.STRING,
      },
      season: {
        type: Sequelize.NUMERIC,
      },
      episode: {
        type: Sequelize.NUMERIC,
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
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Episodes');
  },
};
