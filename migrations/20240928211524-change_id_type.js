/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Watchables', 'imdb_id', {
      type: Sequelize.STRING,
    });
    await queryInterface.changeColumn('Watchables', 'tmdb_id', {
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Watchables', 'imdb_id', {
      type: Sequelize.INTEGER,
    });
    await queryInterface.changeColumn('Watchables', 'tmdb_id', {
      type: Sequelize.INTEGER,
    });
  },
};
