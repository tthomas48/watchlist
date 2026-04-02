const path = require('path');

const ALLOWED_MEDIA_TYPES = new Set(['movie', 'show', 'episode']);

function normalizeTraktPosterMediaType(raw) {
  const t = String(raw || '').toLowerCase().trim();
  return ALLOWED_MEDIA_TYPES.has(t) ? t : null;
}

function parseTraktIdParam(raw) {
  const s = String(raw ?? '').trim();
  return /^\d+$/.test(s) ? s : null;
}

function traktPosterDir() {
  return path.join(__dirname, '../data/img/trakt');
}

/**
 * @returns {string|null} Absolute filesystem path, or null if args invalid.
 */
function traktPosterDiskPath(mediaType, traktId) {
  const t = normalizeTraktPosterMediaType(mediaType);
  const id = parseTraktIdParam(traktId);
  if (!t || !id) {
    return null;
  }
  return path.join(traktPosterDir(), `${t}_${id}.jpg`);
}

/**
 * Same-origin API path for browser img src (session cookie applies).
 * @returns {string|null}
 */
function traktPosterApiPath(mediaType, traktId) {
  const t = normalizeTraktPosterMediaType(mediaType);
  const id = parseTraktIdParam(traktId);
  if (!t || !id) {
    return null;
  }
  return `/api/img/trakt/${t}/${id}`;
}

module.exports = {
  ALLOWED_MEDIA_TYPES,
  normalizeTraktPosterMediaType,
  parseTraktIdParam,
  traktPosterDir,
  traktPosterDiskPath,
  traktPosterApiPath,
};
