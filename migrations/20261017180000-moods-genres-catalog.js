const {
  DEFAULT_MOODS,
  DEFAULT_GENRE_SLUGS,
  DEFAULT_GENRE_TO_MOODS,
  labelFromSlug,
} = require('../api/mood_defaults');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Moods', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      label: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.createTable('Genres', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      label: {
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

    await queryInterface.createTable('GenreMoodMaps', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      genre_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Genres', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mood_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Moods', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('GenreMoodMaps', ['genre_id', 'mood_id'], {
      unique: true,
      name: 'genre_mood_maps_genre_mood_unique',
    });

    await queryInterface.addColumn('Watchables', 'genres_locked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    const now = new Date();
    const moodRows = DEFAULT_MOODS.map((m) => ({
      slug: m.slug,
      label: m.label,
      sort_order: m.sortOrder,
      createdAt: now,
      updatedAt: now,
    }));
    await queryInterface.bulkInsert('Moods', moodRows);

    const genreRows = DEFAULT_GENRE_SLUGS.map((slug) => ({
      slug,
      label: labelFromSlug(slug),
      createdAt: now,
      updatedAt: now,
    }));
    await queryInterface.bulkInsert('Genres', genreRows);

    const [moods] = await queryInterface.sequelize.query('SELECT id, slug FROM Moods');
    const [genres] = await queryInterface.sequelize.query('SELECT id, slug FROM Genres');
    const moodBySlug = Object.fromEntries(moods.map((m) => [m.slug, m.id]));
    const genreBySlug = Object.fromEntries(genres.map((g) => [g.slug, g.id]));

    const mapRows = [];
    for (const [genreSlug, moodSlugs] of Object.entries(DEFAULT_GENRE_TO_MOODS)) {
      const genreId = genreBySlug[genreSlug];
      if (!genreId) continue;
      for (const moodSlug of moodSlugs) {
        const moodId = moodBySlug[moodSlug];
        if (!moodId) continue;
        mapRows.push({
          genre_id: genreId,
          mood_id: moodId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    if (mapRows.length) {
      await queryInterface.bulkInsert('GenreMoodMaps', mapRows);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Watchables', 'genres_locked');
    await queryInterface.dropTable('GenreMoodMaps');
    await queryInterface.dropTable('Genres');
    await queryInterface.dropTable('Moods');
  },
};
