const {
  normalizeGenres,
  slugifyGenreLabel,
  moodsFromGenres,
  loadGenreMoodMap,
  invalidateMoodMapCache,
  recomputeAllWatchableMoods,
} = require('./mood_map');
const { labelFromSlug } = require('./mood_defaults');

function serializeMood(m) {
  return {
    id: m.id,
    slug: m.slug,
    label: m.label,
    sortOrder: m.sort_order,
  };
}

function serializeGenre(g) {
  return {
    id: g.id,
    slug: g.slug,
    label: g.label,
  };
}

async function getMoodsPayload(models) {
  const moods = await models.Mood.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
  const maps = await models.GenreMoodMap.findAll({
    include: [
      { model: models.Genre, as: 'genre', attributes: ['slug'] },
      { model: models.Mood, as: 'mood', attributes: ['slug'] },
    ],
  });
  return {
    moods: moods.map(serializeMood),
    mappings: maps
      .filter((row) => row.genre && row.mood)
      .map((row) => ({
        genreSlug: row.genre.slug,
        moodSlug: row.mood.slug,
      })),
  };
}

async function getGenresPayload(models) {
  const genres = await models.Genre.findAll({ order: [['slug', 'ASC']] });
  return genres.map(serializeGenre);
}

/**
 * Upsert a genre by label (or slug). Returns serialized genre.
 */
async function ensureGenre(models, labelOrSlug) {
  const slug = slugifyGenreLabel(labelOrSlug);
  if (!slug) {
    const err = new Error('Genre label is required');
    err.status = 400;
    throw err;
  }
  let genre = await models.Genre.findOne({ where: { slug } });
  if (genre) {
    return serializeGenre(genre);
  }
  const label = String(labelOrSlug).trim() || labelFromSlug(slug);
  genre = await models.Genre.create({ slug, label });
  return serializeGenre(genre);
}

/**
 * Ensure each genre slug exists in catalog (create with title-case label if missing).
 * @returns {Promise<string[]>} normalized unique slugs
 */
async function ensureGenreSlugs(models, genres) {
  const slugs = normalizeGenres(genres);
  for (const slug of slugs) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await models.Genre.findOne({ where: { slug } });
    if (!existing) {
      // eslint-disable-next-line no-await-in-loop
      await models.Genre.create({ slug, label: labelFromSlug(slug) });
    }
  }
  return slugs;
}

/**
 * Full replace of moods + mappings, then recompute watchable moods.
 */
async function replaceMoodsAndMappings(models, body) {
  const moodsIn = Array.isArray(body?.moods) ? body.moods : null;
  const mappingsIn = Array.isArray(body?.mappings) ? body.mappings : null;
  if (!moodsIn || !mappingsIn) {
    const err = new Error('moods and mappings arrays are required');
    err.status = 400;
    throw err;
  }

  const normalizedMoods = [];
  const seenSlugs = new Set();
  for (let i = 0; i < moodsIn.length; i += 1) {
    const raw = moodsIn[i] || {};
    const slug = slugifyGenreLabel(raw.slug || raw.label);
    const label = String(raw.label || '').trim() || labelFromSlug(slug);
    if (!slug) {
      const err = new Error('Each mood needs a slug or label');
      err.status = 400;
      throw err;
    }
    if (seenSlugs.has(slug)) {
      const err = new Error(`Duplicate mood slug: ${slug}`);
      err.status = 400;
      throw err;
    }
    seenSlugs.add(slug);
    normalizedMoods.push({
      slug,
      label,
      sort_order: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : i,
    });
  }

  const normalizedMappings = [];
  for (const raw of mappingsIn) {
    const genreSlug = slugifyGenreLabel(raw.genreSlug || raw.genre);
    const moodSlug = slugifyGenreLabel(raw.moodSlug || raw.mood);
    if (!genreSlug || !moodSlug) continue;
    if (!seenSlugs.has(moodSlug)) {
      const err = new Error(`Mapping references unknown mood: ${moodSlug}`);
      err.status = 400;
      throw err;
    }
    normalizedMappings.push({ genreSlug, moodSlug });
  }

  await models.sequelize.transaction(async (transaction) => {
    await models.GenreMoodMap.destroy({ where: {}, transaction });
    await models.Mood.destroy({ where: {}, transaction });

    for (const m of normalizedMoods) {
      // eslint-disable-next-line no-await-in-loop
      await models.Mood.create(m, { transaction });
    }

    const moods = await models.Mood.findAll({ transaction });
    const moodBySlug = Object.fromEntries(moods.map((m) => [m.slug, m.id]));

    for (const { genreSlug, moodSlug } of normalizedMappings) {
      // eslint-disable-next-line no-await-in-loop
      let genre = await models.Genre.findOne({ where: { slug: genreSlug }, transaction });
      if (!genre) {
        // eslint-disable-next-line no-await-in-loop
        genre = await models.Genre.create({
          slug: genreSlug,
          label: labelFromSlug(genreSlug),
        }, { transaction });
      }
      // eslint-disable-next-line no-await-in-loop
      await models.GenreMoodMap.create({
        genre_id: genre.id,
        mood_id: moodBySlug[moodSlug],
      }, { transaction });
    }
  });

  invalidateMoodMapCache();
  await recomputeAllWatchableMoods(models);
  return getMoodsPayload(models);
}

/**
 * Apply genres on a watchable: lock + recompute moods.
 */
async function applyWatchableGenres(models, watchable, genresInput) {
  const slugs = await ensureGenreSlugs(models, genresInput);
  const map = await loadGenreMoodMap(models);
  const moods = moodsFromGenres(slugs, map);
  watchable.genres = slugs.length ? slugs : null;
  watchable.moods = moods.length ? moods : null;
  watchable.genres_locked = true;
  return watchable;
}

module.exports = {
  serializeMood,
  serializeGenre,
  getMoodsPayload,
  getGenresPayload,
  ensureGenre,
  ensureGenreSlugs,
  replaceMoodsAndMappings,
  applyWatchableGenres,
};
