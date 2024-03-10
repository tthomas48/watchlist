/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // add trakt_list_id to Notifications table
    await queryInterface.addColumn('Episodes', 'watched', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // remove column trakt_list_id from Notifications table
    await queryInterface.removeColumn('Episodes', 'watched');
  },
};
