const Api = require('./api');

describe('api', () => {
  describe('createWatchable', () => {
    it.each([
      [{
        type: 'movie',
        movie: {
          ids: { imdb: 'tt1234', tmdb: '2343', trakt: '1111' },
          title: 'A Movie',
          homepage: 'https://example.com',
          year: 2021,
        },
      }, {
        homepage: 'https://example.com',
        image: undefined,
        imdb_id: 'tt1234',
        media_type: 'movie',
        title: 'A Movie',
        tmdb_id: '2343',
        trakt_id: '1111',
        trakt_list_id: '1234',
        web_url: null,
        streaming_service_id: null,
        streaming_addon_id: null,
      }],
      [{}, {
        homepage: undefined,
        image: undefined,
        imdb_id: undefined,
        media_type: undefined,
        title: null,
        tmdb_id: undefined,
        trakt_id: undefined,
        trakt_list_id: '1234',
        web_url: null,
        streaming_service_id: null,
        streaming_addon_id: null,
      }],
    ])('should return a promise for creating the watchable', (input, toSave) => {
      const api = new Api();
      const models = {
        Watchable: { create: jest.fn().mockReturnValue(Promise.resolve({})) },
        WatchableUrl: { },
      };
      const output = api.createWatchable(models, '1234', input);
      expect(output).not.toBeNull();
      expect(models.Watchable.create).toHaveBeenCalledWith(toSave);
    });
    it('stores trakt_list_user_slug when list owner slug is provided', () => {
      const api = new Api();
      const models = {
        Watchable: { create: jest.fn().mockReturnValue(Promise.resolve({})) },
        WatchableUrl: { },
      };
      const input = {
        type: 'movie',
        movie: {
          ids: { trakt: '1111' },
          title: 'A Movie',
        },
      };
      api.createWatchable(models, '1234', input, 'list-owner');
      expect(models.Watchable.create).toHaveBeenCalledWith(
        expect.objectContaining({ trakt_list_user_slug: 'list-owner' }),
      );
    });
  });
});
