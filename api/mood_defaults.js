/** Seed defaults matching the original curated map. */

const DEFAULT_MOODS = [
  { slug: 'light', label: 'Light', sortOrder: 0 },
  { slug: 'tense', label: 'Tense', sortOrder: 1 },
  { slug: 'comfort', label: 'Comfort', sortOrder: 2 },
  { slug: 'date_night', label: 'Date night', sortOrder: 3 },
  { slug: 'smart', label: 'Smart', sortOrder: 4 },
  { slug: 'scary', label: 'Scary', sortOrder: 5 },
  { slug: 'family', label: 'Family', sortOrder: 6 },
];

const DEFAULT_GENRE_SLUGS = [
  'action',
  'adventure',
  'animation',
  'comedy',
  'crime',
  'documentary',
  'drama',
  'family',
  'fantasy',
  'history',
  'horror',
  'music',
  'mystery',
  'romance',
  'science-fiction',
  'thriller',
  'war',
  'western',
];

/** @type {Record<string, string[]>} */
const DEFAULT_GENRE_TO_MOODS = {
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

function labelFromSlug(slug) {
  return String(slug)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}

module.exports = {
  DEFAULT_MOODS,
  DEFAULT_GENRE_SLUGS,
  DEFAULT_GENRE_TO_MOODS,
  labelFromSlug,
};
