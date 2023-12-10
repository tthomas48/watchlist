/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      trakt_id: {
        type: Sequelize.STRING,
        unique: true,
      },
      username: {
        type: Sequelize.STRING,
      },
      private: {
        type: Sequelize.BOOLEAN,
      },
      name: {
        type: Sequelize.STRING,
      },
      vip: {
        type: Sequelize.BOOLEAN,
      },
      vip_ep: {
        type: Sequelize.BOOLEAN,
      },
      access_token: {
        type: Sequelize.STRING,
      },
      refresh_token: {
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
    await queryInterface.dropTable('Users');
  },
};
