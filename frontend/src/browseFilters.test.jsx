import {
  hasActiveBrowseFilters,
  browseFiltersToQuery,
  groupByGenre,
  defaultBrowseFilters,
  activeFilterChips,
  clearBrowseFacets,
  countActiveBrowseFilters,
} from './browseFilters';

describe('browseFilters helpers', () => {
  it('hasActiveBrowseFilters detects any facet', () => {
    expect(hasActiveBrowseFilters(defaultBrowseFilters())).toBe(false);
    expect(hasActiveBrowseFilters({ ...defaultBrowseFilters(), mood: 'light' })).toBe(true);
    expect(hasActiveBrowseFilters({ ...defaultBrowseFilters(), q: '  x ' })).toBe(true);
  });

  it('browseFiltersToQuery maps camelCase to API params', () => {
    expect(browseFiltersToQuery({
      mood: 'comfort',
      genre: 'comedy',
      decade: '1980',
      mediaType: 'movie',
      q: ' blade ',
    })).toEqual({
      mood: 'comfort',
      genre: 'comedy',
      decade: '1980',
      media_type: 'movie',
      q: 'blade',
    });
  });

  it('groupByGenre builds shelves and other', () => {
    const shelves = groupByGenre([
      { id: 1, title: 'A', genres: ['comedy', 'drama'] },
      { id: 2, title: 'B', genres: ['comedy'] },
      { id: 3, title: 'C', genres: null },
    ]);
    expect(shelves.find((s) => s.genre === 'comedy').items.map((i) => i.id)).toEqual([1, 2]);
    expect(shelves.find((s) => s.genre === 'drama').items.map((i) => i.id)).toEqual([1]);
    expect(shelves.find((s) => s.genre === 'other').items.map((i) => i.id)).toEqual([3]);
  });

  it('activeFilterChips builds labeled chips for each facet', () => {
    expect(activeFilterChips(defaultBrowseFilters())).toEqual([]);
    expect(activeFilterChips({
      ...defaultBrowseFilters(),
      mood: 'comfort',
      genre: 'comedy',
      decade: '1980',
      mediaType: 'movie',
      q: 'blade',
      viewMode: 'shelves',
    })).toEqual([
      { key: 'mood', label: 'Mood: Comfort' },
      { key: 'genre', label: 'Genre: Comedy' },
      { key: 'decade', label: 'Decade: 1980s' },
      { key: 'mediaType', label: 'Movies' },
      { key: 'q', label: 'Search: blade' },
    ]);
  });

  it('countActiveBrowseFilters ignores viewMode', () => {
    expect(countActiveBrowseFilters({
      ...defaultBrowseFilters(),
      viewMode: 'shelves',
      mood: 'light',
    })).toBe(1);
  });

  it('clearBrowseFacets preserves viewMode', () => {
    expect(clearBrowseFacets({
      mood: 'scary',
      genre: 'horror',
      decade: '1990',
      mediaType: 'movie',
      q: 'x',
      viewMode: 'shelves',
    })).toEqual({
      ...defaultBrowseFilters(),
      viewMode: 'shelves',
    });
  });
});
