const { Sequelize, DataTypes } = require('sequelize');
const defineWatchable = require('../models/watchable');
const { buildWatchlistWhere } = require('./watchlist_filters');

describe('watchlist_filters SQLite integration', () => {
  let sequelize;
  let Watchable;

  beforeAll(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    Watchable = defineWatchable(sequelize, DataTypes);
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Watchable.destroy({ where: {} });
    await Watchable.bulkCreate([
      {
        title: 'Blade Runner',
        trakt_list_id: 'list-1',
        media_type: 'movie',
        year: 1982,
        genres: ['science-fiction', 'thriller'],
        moods: ['smart', 'tense'],
        hidden: false,
        web_url: 'https://example.com/play',
      },
      {
        title: 'The Hangover',
        trakt_list_id: 'list-1',
        media_type: 'movie',
        year: 2009,
        genres: ['comedy'],
        moods: ['light'],
        hidden: false,
        web_url: 'https://example.com/play',
      },
      {
        title: 'Hidden Gem',
        trakt_list_id: 'list-1',
        media_type: 'show',
        year: 1985,
        genres: ['comedy'],
        moods: ['light'],
        hidden: true,
        web_url: 'https://example.com/play',
      },
      {
        // No web_url: only visible in Video Store Mode.
        title: 'Rental Only',
        trakt_list_id: 'list-1',
        media_type: 'movie',
        year: 2001,
        genres: ['drama'],
        moods: ['light'],
        hidden: false,
      },
    ]);
  });

  it('filters by mood and decade AND', async () => {
    const rows = await Watchable.findAll({
      where: buildWatchlistWhere({
        traktListId: 'list-1',
        mood: 'tense',
        decade: 1980,
      }),
    });
    expect(rows.map((r) => r.title)).toEqual(['Blade Runner']);
  });

  it('filters by genre and q', async () => {
    const rows = await Watchable.findAll({
      where: buildWatchlistWhere({
        traktListId: 'list-1',
        genre: 'comedy',
        q: 'Hang',
      }),
    });
    expect(rows.map((r) => r.title)).toEqual(['The Hangover']);
  });

  it('excludes hidden unless showHidden', async () => {
    const visible = await Watchable.findAll({
      where: buildWatchlistWhere({ traktListId: 'list-1', genre: 'comedy' }),
    });
    expect(visible.map((r) => r.title)).toEqual(['The Hangover']);

    const all = await Watchable.findAll({
      where: buildWatchlistWhere({
        traktListId: 'list-1',
        genre: 'comedy',
        showHidden: true,
      }),
    });
    expect(all.map((r) => r.title).sort()).toEqual(['Hidden Gem', 'The Hangover']);
  });

  it('filters by media_type', async () => {
    const rows = await Watchable.findAll({
      where: buildWatchlistWhere({
        traktListId: 'list-1',
        media_type: 'show',
        showHidden: true,
      }),
    });
    expect(rows.map((r) => r.title)).toEqual(['Hidden Gem']);
  });

  it('excludes titles without web_url unless video_store', async () => {
    const playable = await Watchable.findAll({
      where: buildWatchlistWhere({ traktListId: 'list-1' }),
    });
    expect(playable.map((r) => r.title).sort()).toEqual(['Blade Runner', 'The Hangover']);

    const shelf = await Watchable.findAll({
      where: buildWatchlistWhere({
        traktListId: 'list-1',
        video_store: true,
        showHidden: true,
      }),
    });
    expect(shelf.map((r) => r.title).sort()).toEqual([
      'Blade Runner',
      'Hidden Gem',
      'Rental Only',
      'The Hangover',
    ]);
  });
});
