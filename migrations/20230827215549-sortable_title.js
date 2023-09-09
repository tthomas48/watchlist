'use strict';
const { Watchable } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'sortable_title', { type: Sequelize.TEXT });
    // get all the watchables and resave them
    const tasks = [];
    const watchables = await Watchable.findAll();
    for (let watchable of watchables) {
      tasks.push(watchable.save());
    }
    await Promise.all(tasks);  
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Watchables', 'sortable_title');
  }
};
