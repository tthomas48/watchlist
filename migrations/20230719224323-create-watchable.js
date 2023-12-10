/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Watchables', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING,
      },
      trakt_id: {
        type: Sequelize.STRING,
      },
      trakt_list_id: {
        type: Sequelize.STRING,
      },
      justwatch_id: {
        type: Sequelize.STRING,
      },
      image: {
        type: Sequelize.STRING,
      },
      media_type: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Watchables');
  },
};
