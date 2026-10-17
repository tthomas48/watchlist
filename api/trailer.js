/**
 * Prefer official YouTube trailers when choosing among Trakt video rows.
 * @param {Array<{ url?: string, type?: string, official?: boolean, site?: string }>} videos
 * @returns {string|null}
 */
function pickTrailerUrl(videos) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return null;
  }
  const ranked = videos
    .filter((v) => v && typeof v.url === 'string' && v.url.trim() !== '')
    .map((v) => {
      const site = String(v.site || '').toLowerCase();
      let score = 0;
      if (String(v.type || '').toLowerCase() === 'trailer') {
        score += 4;
      }
      if (v.official === true) {
        score += 2;
      }
      if (site === 'youtube') {
        score += 1;
      }
      return { url: v.url.trim(), score };
    });
  if (ranked.length === 0) {
    return null;
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0].url;
}

/**
 * Normalize Trakt `trailer` field (usually a YouTube URL string).
 * @param {unknown} trailer
 * @returns {string|null}
 */
function normalizeTrailerField(trailer) {
  if (trailer == null) {
    return null;
  }
  if (typeof trailer === 'string') {
    const trimmed = trailer.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof trailer === 'object' && typeof trailer.url === 'string') {
    const trimmed = trailer.url.trim();
    return trimmed === '' ? null : trimmed;
  }
  return null;
}

module.exports = {
  pickTrailerUrl,
  normalizeTrailerField,
};
