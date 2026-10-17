const { Op } = require('sequelize');
const {
  buildWatchlistWhere,
  parseListFilters,
  hasActiveListFilters,
} = require('./watchlist_filters');

describe('watchlist_filters', () => {
  describe('parseListFilters', () => {
    it('normalizes facet values', () => {
      expect(parseListFilters({
        genre: ' Comedy ',
        mood: 'Light',
        decade: '1980',
        media_type: 'Movie',
        q: '  blade ',
        personId: '99',
        video_store: 'true',
      })).toEqual({
        genre: 'comedy',
        mood: 'light',
        decade: 1980,
        media_type: 'movie',
        q: 'blade',
        personId: 99,
        video_store: true,
      });
    });

    it('returns nulls when unset and video_store defaults false', () => {
      expect(parseListFilters({})).toEqual({
        genre: null,
        mood: null,
        decade: null,
        media_type: null,
        q: null,
        personId: null,
        video_store: false,
      });
    });

    it('parses videoStore camelCase', () => {
      expect(parseListFilters({ videoStore: true }).video_store).toBe(true);
      expect(parseListFilters({ video_store: '0' }).video_store).toBe(false);
    });
  });

  describe('hasActiveListFilters', () => {
    it('is false when all null', () => {
      expect(hasActiveListFilters(parseListFilters({}))).toBe(false);
    });

    it('is true when any facet set', () => {
      expect(hasActiveListFilters(parseListFilters({ mood: 'comfort' }))).toBe(true);
      expect(hasActiveListFilters(parseListFilters({ decade: 1990 }))).toBe(true);
      expect(hasActiveListFilters(parseListFilters({ personId: 3 }))).toBe(true);
    });

    it('ignores video_store', () => {
      expect(hasActiveListFilters(parseListFilters({ video_store: true }))).toBe(false);
    });
  });

  describe('buildWatchlistWhere', () => {
    it('always scopes to list and excludes hidden by default', () => {
      const where = buildWatchlistWhere({ traktListId: 'list-1' });
      expect(where[Op.and]).toEqual(
        expect.arrayContaining([
          { trakt_list_id: 'list-1' },
          { [Op.or]: [{ hidden: false }, { hidden: null }] },
        ]),
      );
    });

    it('requires non-empty web_url by default (playable-only)', () => {
      const playable = buildWatchlistWhere({ traktListId: 'list-1' });
      const all = buildWatchlistWhere({ traktListId: 'list-1', video_store: true });
      expect(playable[Op.and].length).toBe(all[Op.and].length + 1);
    });

    it('omits web_url filter when video_store is true', () => {
      const playable = buildWatchlistWhere({ traktListId: 'list-1' });
      const all = buildWatchlistWhere({ traktListId: 'list-1', video_store: true });
      expect(all[Op.and].length).toBeLessThan(playable[Op.and].length);
    });

    it('ANDs decade, media_type, and q (genre/mood covered by integration tests)', () => {
      const where = buildWatchlistWhere({
        traktListId: 'list-1',
        genre: 'comedy',
        mood: 'light',
        decade: 1980,
        media_type: 'movie',
        q: 'blade',
      });
      const clauses = where[Op.and];
      expect(clauses).toEqual(
        expect.arrayContaining([
          { year: { [Op.gte]: 1980, [Op.lt]: 1990 } },
          { media_type: 'movie' },
          { title: { [Op.like]: '%blade%' } },
        ]),
      );
      // genre + mood add Sequelize.where(CAST) clauses beyond list/hidden
      expect(clauses.length).toBeGreaterThanOrEqual(6);
    });

    it('omits hidden exclusion when showHidden', () => {
      const where = buildWatchlistWhere({ traktListId: 'list-1', showHidden: true });
      const hasHidden = where[Op.and].some(
        (c) => c[Op.or] && JSON.stringify(c).includes('hidden'),
      );
      expect(hasHidden).toBe(false);
    });

    it('ANDs personId via WatchablePeople subquery', () => {
      const where = buildWatchlistWhere({ traktListId: 'list-1', personId: 7 });
      const personClause = where[Op.and].find((c) => c.id && c.id[Op.in]);
      expect(personClause).toBeTruthy();
      expect(String(personClause.id[Op.in].val || personClause.id[Op.in])).toContain(
        'WatchablePeople',
      );
      expect(String(personClause.id[Op.in].val || personClause.id[Op.in])).toContain('7');
    });
  });
});
