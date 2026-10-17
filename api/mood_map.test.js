const {
  normalizeGenres,
  moodsFromGenres,
  slugifyGenreLabel,
} = require('./mood_map');
const { DEFAULT_GENRE_TO_MOODS } = require('./mood_defaults');

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

  describe('slugifyGenreLabel', () => {
    it('slugifies labels', () => {
      expect(slugifyGenreLabel('Cult Classic')).toBe('cult-classic');
      expect(slugifyGenreLabel('  Science Fiction ')).toBe('science-fiction');
    });
  });

  describe('moodsFromGenres', () => {
    it('maps known genres using injected map', () => {
      expect(moodsFromGenres(['comedy'], { comedy: ['light'] })).toEqual(['light']);
      expect(moodsFromGenres(['romance'], {
        romance: ['date_night', 'comfort'],
      })).toEqual(expect.arrayContaining(['date_night', 'comfort']));
    });

    it('defaults to curated map when none passed', () => {
      expect(moodsFromGenres(['horror'])).toEqual(
        moodsFromGenres(['horror'], DEFAULT_GENRE_TO_MOODS),
      );
    });

    it('unknown genre strings do not crash and yield empty moods', () => {
      expect(moodsFromGenres(['totally-made-up-genre'], {})).toEqual([]);
      expect(moodsFromGenres([null, 123, ''], {})).toEqual([]);
    });

    it('unions moods across multiple genres', () => {
      const moods = moodsFromGenres(['comedy', 'horror'], {
        comedy: ['light'],
        horror: ['scary'],
      });
      expect(moods).toEqual(expect.arrayContaining(['light', 'scary']));
      expect(moods).toHaveLength(2);
    });
  });
});
