const { Sequelize, DataTypes } = require('sequelize');
const defineMood = require('../models/mood');
const defineGenre = require('../models/genre');
const defineGenreMoodMap = require('../models/genre_mood_map');
const defineWatchable = require('../models/watchable');
const {
  replaceMoodsAndMappings,
  ensureGenre,
  applyWatchableGenres,
  getMoodsPayload,
  getGenresPayload,
} = require('./moods_service');

describe('moods_service', () => {
  let sequelize;
  let models;

  beforeAll(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const Mood = defineMood(sequelize, DataTypes);
    const Genre = defineGenre(sequelize, DataTypes);
    const GenreMoodMap = defineGenreMoodMap(sequelize, DataTypes);
    const Watchable = defineWatchable(sequelize, DataTypes);
    models = {
      sequelize, Mood, Genre, GenreMoodMap, Watchable,
    };
    Mood.associate(models);
    Genre.associate(models);
    GenreMoodMap.associate(models);
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await models.GenreMoodMap.destroy({ where: {} });
    await models.Mood.destroy({ where: {} });
    await models.Genre.destroy({ where: {} });
    await models.Watchable.destroy({ where: {} });
  });

  it('ensureGenre creates catalog rows', async () => {
    const created = await ensureGenre(models, 'Cult Classic');
    expect(created).toMatchObject({ slug: 'cult-classic', label: 'Cult Classic' });
    const again = await ensureGenre(models, 'cult-classic');
    expect(again.id).toBe(created.id);
  });

  it('replaceMoodsAndMappings stores moods and mappings then recomputes', async () => {
    await models.Watchable.create({
      title: 'Funny',
      genres: ['comedy'],
      moods: null,
      genres_locked: false,
    });
    const payload = await replaceMoodsAndMappings(models, {
      moods: [{ slug: 'light', label: 'Light', sortOrder: 0 }],
      mappings: [{ genreSlug: 'comedy', moodSlug: 'light' }],
    });
    expect(payload.moods).toHaveLength(1);
    expect(payload.mappings).toEqual([{ genreSlug: 'comedy', moodSlug: 'light' }]);
    const w = await models.Watchable.findOne({ where: { title: 'Funny' } });
    expect(w.moods).toEqual(['light']);
  });

  it('applyWatchableGenres locks and sets moods', async () => {
    await replaceMoodsAndMappings(models, {
      moods: [{ slug: 'scary', label: 'Scary', sortOrder: 0 }],
      mappings: [{ genreSlug: 'horror', moodSlug: 'scary' }],
    });
    const w = await models.Watchable.create({ title: 'X', genres_locked: false });
    await applyWatchableGenres(models, w, ['Horror']);
    await w.save();
    expect(w.genres).toEqual(['horror']);
    expect(w.moods).toEqual(['scary']);
    expect(w.genres_locked).toBe(true);
    const genres = await getGenresPayload(models);
    expect(genres.some((g) => g.slug === 'horror')).toBe(true);
  });

  it('getMoodsPayload returns empty when unset', async () => {
    expect(await getMoodsPayload(models)).toEqual({ moods: [], mappings: [] });
  });
});
