/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'streaming_options_json', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Watchables', 'streaming_checked_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'streaming_checked_at');
    await queryInterface.removeColumn('Watchables', 'streaming_options_json');
  },
};
