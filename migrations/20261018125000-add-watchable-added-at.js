/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'added_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    // Until the next Trakt refresh overwrites this with listed_at, sort by when
    // the row was first stored.
    await queryInterface.sequelize.query(
      'UPDATE "Watchables" SET "added_at" = "createdAt" WHERE "added_at" IS NULL',
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'added_at');
  },
};
