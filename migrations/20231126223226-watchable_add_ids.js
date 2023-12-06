'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'imdb_id', { 
      type: Sequelize.INTEGER,
    });
    await queryInterface.addColumn('Watchables', 'tmdb_id', { 
      type: Sequelize.INTEGER,
    });    
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Watchables', 'imdb_id');
    await queryInterface.removeColumn('Watchables', 'tmdb_id');
  }
};
