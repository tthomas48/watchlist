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
 * Parse a boolean query/body flag. Default false when unset/unknown.
 * @param {unknown} raw
 * @returns {boolean}
 */
function parseBoolFlag(raw) {
  if (raw === true || raw === 1) {
    return true;
  }
  if (raw === false || raw === 0 || raw == null || raw === '') {
    return false;
  }
  const s = String(raw).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') {
    return true;
  }
  return false;
}

/**
 * Parse list-filter query/body fields into a normalized object.
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
  let personId = null;
  const rawPerson = raw.personId != null ? raw.personId : raw.person_id;
  if (rawPerson != null && String(rawPerson).trim() !== '') {
    const n = Number(rawPerson);
    if (Number.isFinite(n) && n > 0) {
      personId = Math.trunc(n);
    }
  }
  const videoStoreRaw = raw.video_store != null ? raw.video_store : raw.videoStore;
  const videoStore = parseBoolFlag(videoStoreRaw);
  return {
    genre,
    mood,
    decade,
    media_type: mediaType,
    q,
    personId,
    video_store: videoStore,
  };
}

/**
 * Whether any browse facet (excluding hidden/list/video_store) is active.
 * @param {ReturnType<typeof parseListFilters>} filters
 */
function hasActiveListFilters(filters) {
  if (!filters) return false;
  return Boolean(
    filters.genre
    || filters.mood
    || filters.decade != null
    || filters.media_type
    || filters.q
    || filters.personId != null,
  );
}

/** Non-empty play URL (ready to Play). */
function hasPlayUrlWhere() {
  return {
    [Op.and]: [
      { web_url: { [Op.ne]: null } },
      Sequelize.where(
        Sequelize.fn('trim', Sequelize.col('web_url')),
        { [Op.ne]: '' },
      ),
    ],
  };
}

/**
 * Build Sequelize where for watchlist listing / filtered vote pools.
 * All set facets combine with AND.
 *
 * @param {object} opts
 * @param {string} opts.traktListId
 * @param {boolean} [opts.showHidden]
 * @param {string|null} [opts.genre]
 * @param {string|null} [opts.mood]
 * @param {number|null} [opts.decade]
 * @param {string|null} [opts.media_type]
 * @param {string|null} [opts.q]
 * @param {number|null} [opts.personId]
 * @param {boolean} [opts.video_store] when true, include titles without web_url
 */
function buildWatchlistWhere({
  traktListId,
  showHidden = false,
  genre = null,
  mood = null,
  decade = null,
  media_type: mediaType = null,
  q = null,
  personId = null,
  video_store: videoStore = false,
}) {
  const and = [{ trakt_list_id: String(traktListId) }];

  if (!showHidden) {
    and.push({ [Op.or]: [{ hidden: false }, { hidden: null }] });
  }

  // Default: playable-only. Video Store Mode (video_store=true) shows the full shelf.
  if (!videoStore) {
    and.push(hasPlayUrlWhere());
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
  if (personId != null && Number.isFinite(Number(personId)) && Number(personId) > 0) {
    const pid = Math.trunc(Number(personId));
    and.push({
      id: {
        [Op.in]: Sequelize.literal(
          `(SELECT watchableId FROM WatchablePeople WHERE personId = ${pid})`,
        ),
      },
    });
  }

  return { [Op.and]: and };
}

module.exports = {
  jsonArrayContains,
  parseBoolFlag,
  parseListFilters,
  hasActiveListFilters,
  hasPlayUrlWhere,
  buildWatchlistWhere,
};
