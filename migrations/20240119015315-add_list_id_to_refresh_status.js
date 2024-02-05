/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // add trakt_list_id string field to the table refresh_statuses
    await queryInterface.addColumn('RefreshStatuses', 'trakt_list_id', {
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface) {
    // remove trakt_list_id string field from the table refresh_statuses
    await queryInterface.removeColumn('RefreshStatuses', 'trakt_list_id');
  },
};
