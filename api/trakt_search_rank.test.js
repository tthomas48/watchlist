const {
  traktIdsFromRecommendationItems,
  sortSearchResultsByRecommendationIds,
} = require('./trakt_search_rank');

describe('trakt_search_rank', () => {
  describe('traktIdsFromRecommendationItems', () => {
    it('collects trakt ids from recommendation-shaped rows', () => {
      const set = traktIdsFromRecommendationItems([
        { title: 'A', ids: { trakt: 10 } },
        { title: 'B', ids: { trakt: '20' } },
        { title: 'C' },
      ]);
      expect(Array.from(set).sort()).toEqual(['10', '20']);
    });

    it('returns empty set for non-array', () => {
      expect(traktIdsFromRecommendationItems(null).size).toBe(0);
    });
  });

  describe('sortSearchResultsByRecommendationIds', () => {
    function row(type, id, tag) {
      return {
        type,
        [type]: { title: tag, ids: { trakt: id } },
      };
    }

    it('leaves order when preferRequested is false', () => {
      const results = [row('movie', 1, 'a'), row('movie', 2, 'b')];
      const set = new Set(['2']);
      const out = sortSearchResultsByRecommendationIds(results, set, { preferRequested: false });
      expect(out.results.map((r) => r.movie.title)).toEqual(['a', 'b']);
      expect(out.meta.recommendationBoost).toBe(false);
      expect(out.meta.boostedCount).toBe(0);
    });

    it('leaves order when recommendation set is empty', () => {
      const results = [row('movie', 1, 'a'), row('movie', 2, 'b')];
      const out = sortSearchResultsByRecommendationIds(results, new Set(), {
        preferRequested: true,
      });
      expect(out.results.map((r) => r.movie.title)).toEqual(['a', 'b']);
      expect(out.meta.recommendationBoost).toBe(false);
    });

    it('moves recommended ids first, stable within tiers', () => {
      const results = [
        row('movie', 1, 'x'),
        row('show', 10, 'y'),
        row('movie', 2, 'z'),
        row('show', 11, 'w'),
      ];
      const set = new Set(['2', '11']);
      const out = sortSearchResultsByRecommendationIds(results, set, { preferRequested: true });
      expect(out.meta.recommendationBoost).toBe(true);
      expect(out.meta.boostedCount).toBe(2);
      expect(out.results.map((r) => `${r.type}:${r[r.type].ids.trakt}`)).toEqual([
        'movie:2',
        'show:11',
        'movie:1',
        'show:10',
      ]);
    });
  });
});
