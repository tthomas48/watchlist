const {
  normalizeGenres,
  moodsFromGenres,
  MOOD_IDS,
} = require('./mood_map');

describe('mood_map', () => {
  describe('normalizeGenres', () => {
    it('lowercases and dedupes', () => {
      expect(normalizeGenres(['Comedy', 'DRAMA', 'comedy'])).toEqual(['comedy', 'drama']);
    });

    it('returns empty array for non-arrays', () => {
      expect(normalizeGenres(null)).toEqual([]);
      expect(normalizeGenres(undefined)).toEqual([]);
      expect(normalizeGenres('comedy')).toEqual([]);
    });
  });

  describe('moodsFromGenres', () => {
    it('maps known genres to curated moods', () => {
      expect(moodsFromGenres(['comedy'])).toEqual(['light']);
      expect(moodsFromGenres(['romance'])).toEqual(
        expect.arrayContaining(['date_night', 'comfort']),
      );
      expect(moodsFromGenres(['horror'])).toEqual(['scary']);
      expect(moodsFromGenres(['thriller', 'crime'])).toEqual(['tense']);
      expect(moodsFromGenres(['drama'])).toEqual(['smart']);
      expect(moodsFromGenres(['family'])).toEqual(['family']);
      expect(moodsFromGenres(['animation'])).toEqual(['family']);
      expect(moodsFromGenres(['science-fiction'])).toEqual(['smart']);
    });

    it('unions moods across multiple genres', () => {
      const moods = moodsFromGenres(['comedy', 'horror']);
      expect(moods).toEqual(expect.arrayContaining(['light', 'scary']));
      expect(moods).toHaveLength(2);
    });

    it('unknown genre strings do not crash and yield empty moods', () => {
      expect(moodsFromGenres(['totally-made-up-genre'])).toEqual([]);
      expect(moodsFromGenres([null, 123, ''])).toEqual([]);
    });

    it('only emits known mood ids', () => {
      const moods = moodsFromGenres([
        'comedy', 'romance', 'horror', 'thriller', 'drama', 'family', 'science-fiction',
      ]);
      for (const m of moods) {
        expect(MOOD_IDS).toContain(m);
      }
    });
  });
});
