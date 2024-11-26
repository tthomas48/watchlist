/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // add trakt_list_id to Notifications table
    await queryInterface.addColumn('Watchables', 'noautoadvance', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    // remove column trakt_list_id from Notifications table
    await queryInterface.removeColumn('Watchables', 'noautoadvance');
  },
};
