const { Watchable } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Watchables', 'sortable_title', { type: Sequelize.TEXT });
    // FIXME: New fields break this. We need to do this in code.
    // get all the watchables and resave them
    const watchables = await Watchable.findAll({ attributes: ['id', 'sortable_title'] });
    const tasks = [];
    for (let i = 0; i < watchables.length; i += 1) {
      tasks.push(watchables[i].save({ fields: ['sortable_title'] }));
    }
    await Promise.all(tasks);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'sortable_title');
  },
};
