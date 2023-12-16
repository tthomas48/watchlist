/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'local', { type: Sequelize.BOOLEAN });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'local');
  },
};
