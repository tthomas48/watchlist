/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // add trakt_list_id to Notifications table
    await queryInterface.addColumn('Notifications', 'trakt_list_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    // remove column trakt_list_id from Notifications table
    await queryInterface.removeColumn('Notifications', 'trakt_list_id');
  },
};
