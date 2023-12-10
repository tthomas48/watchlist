/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('providers', [
      {
        name: 'AMC+',
        url: 'https://www.amcplus.com/search?search=',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Netflix',
        url: 'https://www.netflix.com/search?q=',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Peacock',
        url: 'https://www.peacocktv.com/watch/search',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'PBS',
        url: 'https://www.pbs.org/search/?q=',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Amazon',
        url: 'https://www.amazon.com/s?k=',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Max',
        url: 'https://play.max.com/search/result?q=',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Disney+',
        url: 'https://www.disneyplus.com/search',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Hulu',
        url: 'https://www.hulu.com/search',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Paramount+',
        url: 'https://www.paramountplus.com/search/',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('providers', [
      {
        name: 'AMC+',
        url: 'https://www.amcplus.com/search?search=',
      },
      {
        name: 'Netflix',
        url: 'https://www.netflix.com/search?q=',
      },
      {
        name: 'Peacock',
        url: 'https://www.peacocktv.com/watch/search',
      },
      {
        name: 'PBS',
        url: 'https://www.pbs.org/search/?q=',
      },
      {
        name: 'Amazon',
        url: 'https://www.amazon.com/s?k=',
      },
      {
        name: 'Max',
        url: 'https://play.max.com/search/result?q=',
      },
      {
        name: 'Disney+',
        url: 'https://www.disneyplus.com/search',
      },
      {
        name: 'Hulu',
        url: 'https://www.hulu.com/search',
      },
      {
        name: 'Paramount+',
        url: 'https://www.paramountplus.com/search/',
      },
    ]);
  },
};
