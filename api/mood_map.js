/**
 * Genre → mood derivation for feel-like browsing.
 * Map comes from DB (see loadGenreMoodMap); unknown genres yield no moods.
 */

const { DEFAULT_GENRE_TO_MOODS } = require('./mood_defaults');

/**
 * @param {unknown} genres
 * @returns {string[]}
 */
function normalizeGenres(genres) {
  if (!Array.isArray(genres)) {
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const g of genres) {
    if (g == null) continue;
    const key = String(g).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * @param {string} labelOrSlug
 * @returns {string}
 */
function slugifyGenreLabel(labelOrSlug) {
  return String(labelOrSlug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @param {unknown} genres
 * @param {Record<string, string[]>} [genreToMoodsMap]
 * @returns {string[]}
 */
function moodsFromGenres(genres, genreToMoodsMap = DEFAULT_GENRE_TO_MOODS) {
  const moods = new Set();
  const map = genreToMoodsMap || {};
  for (const genre of normalizeGenres(genres)) {
    const mapped = map[genre];
    if (!mapped) continue;
    for (const mood of mapped) {
      moods.add(mood);
    }
  }
  return [...moods];
}

let cachedMap = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

function invalidateMoodMapCache() {
  cachedMap = null;
  cachedAt = 0;
}

/**
 * @param {object} models
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<Record<string, string[]>>}
 */
async function loadGenreMoodMap(models, opts = {}) {
  const now = Date.now();
  if (!opts.force && cachedMap && (now - cachedAt) < CACHE_MS) {
    return cachedMap;
  }
  const rows = await models.GenreMoodMap.findAll({
    include: [
      { model: models.Genre, as: 'genre', attributes: ['slug'] },
      { model: models.Mood, as: 'mood', attributes: ['slug'] },
    ],
  });
  const map = {};
  for (const row of rows) {
    const genreSlug = row.genre?.slug;
    const moodSlug = row.mood?.slug;
    if (!genreSlug || !moodSlug) continue;
    if (!map[genreSlug]) map[genreSlug] = [];
    if (!map[genreSlug].includes(moodSlug)) {
      map[genreSlug].push(moodSlug);
    }
  }
  cachedMap = map;
  cachedAt = now;
  return map;
}

/**
 * Recompute Watchables.moods from stored genres + current map.
 * @param {object} models
 */
async function recomputeAllWatchableMoods(models) {
  const map = await loadGenreMoodMap(models, { force: true });
  const watchables = await models.Watchable.findAll({
    attributes: ['id', 'genres', 'moods'],
  });
  let updated = 0;
  for (const w of watchables) {
    const genres = normalizeGenres(w.genres);
    const moods = moodsFromGenres(genres, map);
    const next = moods.length ? moods : null;
    const prev = Array.isArray(w.moods) ? w.moods : null;
    const same = JSON.stringify(prev) === JSON.stringify(next);
    if (!same) {
      // Use update() to avoid beforeUpdate hooks that require title
      // eslint-disable-next-line no-await-in-loop
      await models.Watchable.update({ moods: next }, { where: { id: w.id } });
      updated += 1;
    }
  }
  return { updated, total: watchables.length };
}

module.exports = {
  normalizeGenres,
  slugifyGenreLabel,
  moodsFromGenres,
  loadGenreMoodMap,
  invalidateMoodMapCache,
  recomputeAllWatchableMoods,
};
