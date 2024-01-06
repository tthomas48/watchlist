const { Description } = require('@mui/icons-material');
const Api = require('./api');

describe('api', () => {
  describe('addUrls', () => {
    it('should not error if urls i null', () => {
      const api = new Api();
      api.addUrls(null, null);
    });
    it('should not change the size of watchable.urls if urls is empty', () => {
      const api = new Api();
      const watchable = { urls: [] };
      api.addUrls(watchable, 'abc', [], 'web');
      expect(watchable.urls).toHaveLength(0);
    });
    it('should not change the size of watchable.urls if there is a null url', () => {
      const api = new Api();
      const watchable = { urls: [] };
      api.addUrls(watchable, 'abc', [null], 'web');
      expect(watchable.urls).toHaveLength(0);
    });
    it('should not change the size of watchable.urls if there is an empty url', () => {
      const api = new Api();
      const watchable = { urls: [] };
      api.addUrls(watchable, 'abc', [''], 'web');
      expect(watchable.urls).toHaveLength(0);
    });
    it('should add url', () => {
      const api = new Api();
      const watchable = { urls: [{}] };
      api.addUrls(watchable, 'abc', ['https://example.com'], 'web');
      expect(watchable.urls).toHaveLength(2);
      expect(watchable.urls[1].url).toEqual('https://example.com');
      expect(watchable.urls[1].service_type).toEqual('web');
      expect(watchable.urls[1].custom).toBeFalsy();
      expect(watchable.urls[1].provider_id).toEqual('abc');
    });
  });
  describe('createWatchable', () => {
    it.each([
      [{
        type: 'movie', movie: { ids: { imdb: 'tt1234', tmdb: '2343', trakt: '1111' }, title: 'A Movie', year: 2021 },
      }, {
        image: undefined,
        imdb_id: 'tt1234',
        media_type: 'movie',
        title: 'A Movie',
        tmdb_id: '2343',
        trakt_id: '1111',
        trakt_list_id: '1234',
        urls: [],
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
        urls: [],
      }],
    ])('should return a promise for creating the watchable', (input, toSave) => {
      const api = new Api();
      const models = {
        Watchable: { create: jest.fn().mockReturnValue(Promise.resolve({})) },
        WatchableUrl: { },
      };
      const output = api.createWatchable(models, '1234', input);
      expect(output).not.toBeNull();
      expect(models.Watchable.create).toHaveBeenCalledWith(toSave, { include: [{ model: models.WatchableUrl, as: 'urls' }] });
    });
  });
});
