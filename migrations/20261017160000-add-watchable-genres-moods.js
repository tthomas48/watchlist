/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'genres', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('Watchables', 'moods', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'moods');
    await queryInterface.removeColumn('Watchables', 'genres');
  },
};
