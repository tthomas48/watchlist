const { Op, Sequelize } = require('sequelize');

/**
 * Match a JSON string-array column that contains a given scalar value.
 * Cast to TEXT so Sequelize does not JSON-encode the LIKE pattern
 * (which would produce LIKE '"%\\"comedy\\"%"' and never match).
 * @param {string} column
 * @param {string} value
 */
function jsonArrayContains(column, value) {
  const normalized = String(value).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!normalized) {
    return Sequelize.literal('1=0');
  }
  return Sequelize.where(
    Sequelize.cast(Sequelize.col(column), 'TEXT'),
    { [Op.like]: `%"${normalized}"%` },
  );
}

/**
 * Parse list-filter query/body fields into a normalized object.
 * `personId` is reserved (ignored until People recommenders ship).
 * @param {Record<string, unknown>} raw
 */
function parseListFilters(raw = {}) {
  const genre = raw.genre != null && String(raw.genre).trim() !== ''
    ? String(raw.genre).trim().toLowerCase()
    : null;
  const mood = raw.mood != null && String(raw.mood).trim() !== ''
    ? String(raw.mood).trim().toLowerCase()
    : null;
  let decade = null;
  if (raw.decade != null && String(raw.decade).trim() !== '') {
    const n = Number(raw.decade);
    if (Number.isFinite(n)) {
      decade = Math.trunc(n);
    }
  }
  const mediaType = raw.media_type != null && String(raw.media_type).trim() !== ''
    ? String(raw.media_type).trim().toLowerCase()
    : (raw.mediaType != null && String(raw.mediaType).trim() !== ''
      ? String(raw.mediaType).trim().toLowerCase()
      : null);
  const q = raw.q != null && String(raw.q).trim() !== ''
    ? String(raw.q).trim()
    : null;
  return {
    genre, mood, decade, media_type: mediaType, q,
  };
}

/**
 * Whether any browse facet (excluding hidden/list) is active.
 * @param {ReturnType<typeof parseListFilters>} filters
 */
function hasActiveListFilters(filters) {
  if (!filters) return false;
  return Boolean(
    filters.genre
    || filters.mood
    || filters.decade != null
    || filters.media_type
    || filters.q,
  );
}

/**
 * Build Sequelize where for watchlist listing / filtered vote pools.
 * All set facets combine with AND. personId is ignored (reserved).
 *
 * @param {object} opts
 * @param {string} opts.traktListId
 * @param {boolean} [opts.showHidden]
 * @param {string|null} [opts.genre]
 * @param {string|null} [opts.mood]
 * @param {number|null} [opts.decade]
 * @param {string|null} [opts.media_type]
 * @param {string|null} [opts.q]
 */
function buildWatchlistWhere({
  traktListId,
  showHidden = false,
  genre = null,
  mood = null,
  decade = null,
  media_type: mediaType = null,
  q = null,
}) {
  const and = [{ trakt_list_id: String(traktListId) }];

  if (!showHidden) {
    and.push({ [Op.or]: [{ hidden: false }, { hidden: null }] });
  }

  if (genre) {
    and.push(jsonArrayContains('genres', genre));
  }
  if (mood) {
    and.push(jsonArrayContains('moods', mood));
  }
  if (decade != null && Number.isFinite(Number(decade))) {
    const start = Math.trunc(Number(decade));
    and.push({
      year: {
        [Op.gte]: start,
        [Op.lt]: start + 10,
      },
    });
  }
  if (mediaType) {
    and.push({ media_type: mediaType });
  }
  if (q) {
    and.push({ title: { [Op.like]: `%${q}%` } });
  }

  return { [Op.and]: and };
}

module.exports = {
  jsonArrayContains,
  parseListFilters,
  hasActiveListFilters,
  buildWatchlistWhere,
};
