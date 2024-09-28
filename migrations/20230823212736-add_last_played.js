/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'last_played', {
      type: Sequelize.DATE,
    });
    await queryInterface.sequelize.query('UPDATE "Watchables" set last_played = CURRENT_TIMESTAMP');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'last_played');
  },
};
