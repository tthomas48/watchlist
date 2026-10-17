/**
 * Curated Trakt genre → mood mapping for feel-like browsing.
 * Unknown genres produce no moods (safe no-op).
 */

const GENRE_TO_MOODS = {
  comedy: ['light'],
  romance: ['date_night', 'comfort'],
  horror: ['scary'],
  thriller: ['tense'],
  crime: ['tense'],
  drama: ['smart'],
  family: ['family'],
  animation: ['family'],
  'science-fiction': ['smart'],
};

const MOOD_IDS = [
  'light',
  'tense',
  'comfort',
  'date_night',
  'smart',
  'scary',
  'family',
];

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
 * @param {unknown} genres
 * @returns {string[]}
 */
function moodsFromGenres(genres) {
  const moods = new Set();
  for (const genre of normalizeGenres(genres)) {
    const mapped = GENRE_TO_MOODS[genre];
    if (!mapped) continue;
    for (const mood of mapped) {
      moods.add(mood);
    }
  }
  return [...moods];
}

module.exports = {
  GENRE_TO_MOODS,
  MOOD_IDS,
  normalizeGenres,
  moodsFromGenres,
};
