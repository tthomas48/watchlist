const debug = require('debug')('watchlist:migration');
const { Watchable } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // frist we're going to add a web_url field to the watchables table
    // second we're going to get all Watchables including urls
    // third we're going to find the urls that matches 'web'
    // and assign its value to the web_url field
    // fourth we're going to save all the watchables
    // fifth we're going to drop the watchable_urls table
    const urls = await queryInterface.sequelize.query(
      'SELECT * FROM "WatchableUrls"',
      { type: Sequelize.QueryTypes.SELECT },
    );
    // await queryInterface.removeColumn('Watchables', 'web_url');
    await queryInterface.addColumn('Watchables', 'web_url', {
      type: Sequelize.STRING,
    });

    const watchables = await Watchable.findAll({ attributes: ['id', 'title', 'sortable_title'] });
    const tasks = [];
    for (let i = 0; i < watchables.length; i += 1) {
      const webUrl = urls.find((url) => url.watchable_id === watchables[i].id && url.service_type === 'web');
      if (webUrl) {
        watchables[i].web_url = webUrl.url;
        tasks.push((async () => {
          try {
            await watchables[i].save({ fields: ['web_url'] });
          } catch (e) {
            debug('error trying to save', watchables[i], e);
          }
        })());
      }
    }
    await Promise.all(tasks);

    await queryInterface.dropTable('WatchableUrls');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('WatchableUrls', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      watchable_id: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'watchables',
          },
          key: 'id',
        },
        onDelete: 'CASCADE',
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      service_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      custom: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      provider_id: {
        type: Sequelize.STRING,
        allowNull: false,
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
    await queryInterface.removeColumn('Watchables', 'web_url');
  },
};
