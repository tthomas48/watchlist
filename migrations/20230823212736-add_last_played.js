
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'last_played', { 
      type: Sequelize.DATE,
    });
    await  queryInterface.sequelize.query('UPDATE watchables set last_played = CURRENT_TIMESTAMP');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Watchables', 'last_played');
  }
};
