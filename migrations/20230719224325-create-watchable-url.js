'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('WatchableUrls', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      watchable_id: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'watchables',
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      service_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      selected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },      
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('WatchableUrls');
  }
};