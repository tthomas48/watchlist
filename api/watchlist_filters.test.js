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
      })).toEqual({
        genre: 'comedy',
        mood: 'light',
        decade: 1980,
        media_type: 'movie',
        q: 'blade',
      });
    });

    it('returns nulls when unset', () => {
      expect(parseListFilters({})).toEqual({
        genre: null,
        mood: null,
        decade: null,
        media_type: null,
        q: null,
      });
    });
  });

  describe('hasActiveListFilters', () => {
    it('is false when all null', () => {
      expect(hasActiveListFilters(parseListFilters({}))).toBe(false);
    });

    it('is true when any facet set', () => {
      expect(hasActiveListFilters(parseListFilters({ mood: 'comfort' }))).toBe(true);
      expect(hasActiveListFilters(parseListFilters({ decade: 1990 }))).toBe(true);
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
  });
});
