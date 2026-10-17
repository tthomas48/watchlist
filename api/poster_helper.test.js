const {
  normalizePosterValue,
  posterFromExtendedItem,
  posterUrlForCandidate,
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

  describe('posterUrlForCandidate', () => {
    const embeddedUrl =
      'https://media.trakt.tv/images/movies/001/333/279/posters/medium/x.jpg';

    it('returns embedded list poster without calling getImages or search', async () => {
      const traktClient = {
        getImages: jest.fn(),
        traktClient: { search: { id: jest.fn() } },
      };
      const item = {
        type: 'movie',
        movie: {
          ids: { trakt: 42 },
          images: {
            poster: ['media.trakt.tv/images/movies/001/333/279/posters/medium/x.jpg.webp'],
          },
        },
      };
      await expect(posterUrlForCandidate(traktClient, item)).resolves.toBe(embeddedUrl);
      expect(traktClient.getImages).not.toHaveBeenCalled();
      expect(traktClient.traktClient.search.id).not.toHaveBeenCalled();
    });

    it('uses getImages when embedded poster is missing', async () => {
      const traktClient = {
        getImages: jest.fn().mockResolvedValue({
          poster: { full: 'https://tmdb.org/from-plugin.jpg' },
        }),
        traktClient: { search: { id: jest.fn() } },
      };
      const item = {
        type: 'movie',
        movie: { ids: { trakt: 99 }, title: 'No Images' },
      };
      await expect(posterUrlForCandidate(traktClient, item)).resolves.toBe(
        'https://tmdb.org/from-plugin.jpg',
      );
      expect(traktClient.getImages).toHaveBeenCalledWith({ trakt: 99, type: 'movie' });
      expect(traktClient.traktClient.search.id).not.toHaveBeenCalled();
    });

    it('falls back to search.id extended=full when getImages has no poster', async () => {
      const traktClient = {
        getImages: jest.fn().mockResolvedValue({}),
        traktClient: {
          search: {
            id: jest.fn().mockResolvedValue([
              {
                movie: {
                  images: {
                    poster: [
                      'media.trakt.tv/images/movies/000/000/001/posters/medium/y.jpg.webp',
                    ],
                  },
                },
              },
            ]),
          },
        },
      };
      const item = {
        type: 'movie',
        movie: { ids: { trakt: 1 } },
      };
      await expect(posterUrlForCandidate(traktClient, item)).resolves.toBe(
        'https://media.trakt.tv/images/movies/000/000/001/posters/medium/y.jpg',
      );
      expect(traktClient.traktClient.search.id).toHaveBeenCalledWith({
        id_type: 'trakt',
        id: 1,
        type: 'movie',
        extended: 'full',
      });
    });
  });
});
