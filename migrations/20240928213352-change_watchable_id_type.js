/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (queryInterface.queryGenerator.dialect === 'sqlite') {
      await queryInterface.changeColumn('Episodes', 'watchable_id', {
        type: Sequelize.INTEGER,
      });
    } else {
      await queryInterface.changeColumn('Episodes', 'watchable_id', {
        type: 'INTEGER USING CAST("watchable_id" as INTEGER)',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    if (queryInterface.queryGenerator.dialect === 'sqlite') {
      await queryInterface.changeColumn('Episodes', 'watchable_id', {
        type: Sequelize.INTEGER,
      });
    } else {
      await queryInterface.changeColumn('Episodes', 'watchable_id', {
        type: 'STRING USING CAST("watchable_id" as STIRNG)',
      });
    }
  },
};
