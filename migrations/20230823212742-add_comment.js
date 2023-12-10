/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'comment', { type: Sequelize.TEXT });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'comment');
  },
};
