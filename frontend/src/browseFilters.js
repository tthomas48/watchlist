export const MOOD_OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'tense', label: 'Tense' },
  { id: 'comfort', label: 'Comfort' },
  { id: 'date_night', label: 'Date night' },
  { id: 'smart', label: 'Smart' },
  { id: 'scary', label: 'Scary' },
  { id: 'family', label: 'Family' },
];

export const GENRE_OPTIONS = [
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

export const DECADE_OPTIONS = [
  1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020,
];

export const MEDIA_TYPE_OPTIONS = [
  { value: 'movie', label: 'Movies' },
  { value: 'show', label: 'Shows' },
];

export const defaultBrowseFilters = () => ({
  mood: '',
  genre: '',
  decade: '',
  mediaType: '',
  q: '',
  personId: '',
  viewMode: 'flat',
  videoStoreMode: false,
});

export function hasActiveBrowseFilters(filters) {
  if (!filters) return false;
  return Boolean(
    filters.mood
    || filters.genre
    || filters.decade
    || filters.mediaType
    || (filters.q && String(filters.q).trim())
    || filters.personId,
  );
}

/** Clear facet filters only; preserve viewMode and videoStoreMode. */
export function clearBrowseFacets(filters) {
  return {
    ...defaultBrowseFilters(),
    viewMode: filters?.viewMode || 'flat',
    videoStoreMode: Boolean(filters?.videoStoreMode),
  };
}

/**
 * Active facet chips for the SortBar summary.
 * @param {object} filters
 * @param {{ id: number|string, name: string }[]} [people]
 * @returns {{ key: string, label: string }[]}
 */
export function activeFilterChips(filters, people = []) {
  if (!filters) return [];
  const chips = [];
  if (filters.mood) {
    const mood = MOOD_OPTIONS.find((m) => m.id === filters.mood);
    chips.push({ key: 'mood', label: `Mood: ${mood?.label || filters.mood}` });
  }
  if (filters.genre) {
    chips.push({ key: 'genre', label: `Genre: ${formatGenreLabel(filters.genre)}` });
  }
  if (filters.decade) {
    chips.push({ key: 'decade', label: `Decade: ${filters.decade}s` });
  }
  if (filters.mediaType) {
    const type = MEDIA_TYPE_OPTIONS.find((t) => t.value === filters.mediaType);
    chips.push({ key: 'mediaType', label: type?.label || filters.mediaType });
  }
  if (filters.q && String(filters.q).trim()) {
    chips.push({ key: 'q', label: `Search: ${String(filters.q).trim()}` });
  }
  if (filters.personId) {
    const person = people.find((p) => String(p.id) === String(filters.personId));
    chips.push({
      key: 'personId',
      label: person?.name ? `From: ${person.name}` : `From: #${filters.personId}`,
    });
  }
  return chips;
}

export function countActiveBrowseFilters(filters) {
  return activeFilterChips(filters).length;
}

export function browseFiltersToQuery(filters) {
  const query = {};
  if (!filters) return query;
  if (filters.mood) query.mood = filters.mood;
  if (filters.genre) query.genre = filters.genre;
  if (filters.decade) query.decade = filters.decade;
  if (filters.mediaType) query.media_type = filters.mediaType;
  if (filters.q && String(filters.q).trim()) query.q = String(filters.q).trim();
  if (filters.personId) query.personId = String(filters.personId);
  // Only send when on — API defaults to playable-only (video_store off).
  if (filters.videoStoreMode) query.video_store = 'true';
  return query;
}

/** Group watchables into genre shelves; titles may appear in multiple shelves. */
export function groupByGenre(items) {
  const shelves = new Map();
  const uncategorized = [];
  for (const item of items || []) {
    const genres = Array.isArray(item.genres) ? item.genres : [];
    if (!genres.length) {
      uncategorized.push(item);
      continue;
    }
    for (const g of genres) {
      const key = String(g).toLowerCase();
      if (!shelves.has(key)) shelves.set(key, []);
      shelves.get(key).push(item);
    }
  }
  const ordered = [...shelves.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([genre, shelfItems]) => ({ genre, items: shelfItems }));
  if (uncategorized.length) {
    ordered.push({ genre: 'other', items: uncategorized });
  }
  return ordered;
}

export function formatGenreLabel(genre) {
  if (!genre || genre === 'other') return 'Other';
  return String(genre)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}
