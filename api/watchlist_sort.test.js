const { Sequelize, DataTypes } = require('sequelize');
const defineWatchable = require('../models/watchable');
const { watchlistSortOrder } = require('./watchlist_sort');

describe('watchlistSortOrder', () => {
  it('maps recently-added to added_at then id descending', () => {
    expect(watchlistSortOrder('recently-added')).toEqual([
      ['added_at', 'DESC'],
      ['id', 'DESC'],
    ]);
  });

  it('keeps the existing sort keys', () => {
    expect(watchlistSortOrder('least-watched')).toEqual([['last_played', 'ASC']]);
    expect(watchlistSortOrder('most-watched')).toEqual([['last_played', 'DESC']]);
    expect(watchlistSortOrder('alpha-asc')).toEqual([['sortable_title', 'ASC']]);
    expect(watchlistSortOrder('alpha-desc')).toEqual([['sortable_title', 'DESC']]);
    expect(watchlistSortOrder('unknown')).toEqual([['last_played', 'ASC']]);
  });
});

describe('recently added SQLite order', () => {
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
  });

  it('returns newest added_at first, then higher id when timestamps match', async () => {
    await Watchable.bulkCreate([
      { title: 'Old', trakt_list_id: 'list-1', added_at: new Date('2020-01-01T00:00:00.000Z') },
      { title: 'New A', trakt_list_id: 'list-1', added_at: new Date('2024-01-01T00:00:00.000Z') },
      { title: 'Mid', trakt_list_id: 'list-1', added_at: new Date('2022-01-01T00:00:00.000Z') },
      { title: 'New B', trakt_list_id: 'list-1', added_at: new Date('2024-01-01T00:00:00.000Z') },
    ]);
    const rows = await Watchable.findAll({
      order: watchlistSortOrder('recently-added'),
    });
    expect(rows.map((r) => r.title)).toEqual(['New B', 'New A', 'Mid', 'Old']);
  });

  it('sets added_at on create when the caller omits it', async () => {
    const before = Date.now();
    const row = await Watchable.create({ title: 'Local', trakt_list_id: 'list-1' });
    expect(row.added_at).toBeInstanceOf(Date);
    expect(row.added_at.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('keeps an explicit added_at on create', async () => {
    const listedAt = new Date('2019-05-04T00:00:00.000Z');
    const row = await Watchable.create({
      title: 'From Trakt',
      trakt_list_id: 'list-1',
      added_at: listedAt,
    });
    expect(row.added_at).toEqual(listedAt);
  });
});
