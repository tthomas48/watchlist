const { Description } = require('@mui/icons-material');
const Api = require('./api');

describe('api', () => {
  describe('createWatchable', () => {
    it.each([
      [{
        type: 'movie', movie: { ids: { imdb: 'tt1234', tmdb: '2343', trakt: '1111' }, title: 'A Movie', homepage: 'https://example.com', year: 2021 },
      }, {
        homepage: 'https://example.com',
        image: undefined,
        imdb_id: 'tt1234',
        media_type: 'movie',
        title: 'A Movie',
        tmdb_id: '2343',
        trakt_id: '1111',
        trakt_list_id: '1234',
      }],
      [{
      }, {
        image: undefined,
        imdb_id: undefined,
        media_type: undefined,
        title: null,
        tmdb_id: undefined,
        trakt_id: undefined,
        trakt_list_id: '1234',
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
  });
});
