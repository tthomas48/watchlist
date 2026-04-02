const {
  normalizePosterValue,
  posterFromExtendedItem,
} = require('./poster_helper');

describe('poster_helper', () => {
  describe('normalizePosterValue', () => {
    it('turns Trakt CDN host path with trailing .webp into https URL', () => {
      const raw =
        'media.trakt.tv/images/movies/001/333/279/posters/medium/d2d3cfc787.jpg.webp';
      expect(normalizePosterValue(raw)).toBe(
        'https://media.trakt.tv/images/movies/001/333/279/posters/medium/d2d3cfc787.jpg',
      );
    });

    it('adds https for Trakt CDN path without .webp', () => {
      const raw =
        'media.trakt.tv/images/movies/001/333/279/posters/medium/d2d3cfc787.jpg';
      expect(normalizePosterValue(raw)).toBe(
        'https://media.trakt.tv/images/movies/001/333/279/posters/medium/d2d3cfc787.jpg',
      );
    });

    it('leaves full https URLs unchanged', () => {
      const url = 'https://example.com/poster.png';
      expect(normalizePosterValue(url)).toBe(url);
    });

    it('normalizes protocol-relative URLs', () => {
      expect(normalizePosterValue('//cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg');
    });

    it('normalizes last element of array (Trakt shape)', () => {
      const raw = [
        'media.trakt.tv/images/movies/001/333/279/posters/medium/d2d3cfc787.jpg.webp',
      ];
      expect(normalizePosterValue(raw)).toBe(
        'https://media.trakt.tv/images/movies/001/333/279/posters/medium/d2d3cfc787.jpg',
      );
    });

    it('prefers full on poster objects', () => {
      expect(
        normalizePosterValue({
          full: 'https://tmdb.org/poster.jpg',
          medium: 'ignored',
        }),
      ).toBe('https://tmdb.org/poster.jpg');
    });

    it('returns null for non-URL garbage strings', () => {
      expect(normalizePosterValue('not a url')).toBe(null);
    });
  });

  describe('posterFromExtendedItem', () => {
    it('reads nested movie images.poster Trakt path', () => {
      const item = {
        type: 'movie',
        movie: {
          ids: { trakt: 1333279 },
          images: {
            poster: [
              'media.trakt.tv/images/movies/001/333/279/posters/medium/x.jpg.webp',
            ],
          },
        },
      };
      expect(posterFromExtendedItem(item)).toBe(
        'https://media.trakt.tv/images/movies/001/333/279/posters/medium/x.jpg',
      );
    });
  });
});
