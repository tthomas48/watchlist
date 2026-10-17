const Sentry = require('@sentry/node');
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
        overview: null,
        year: 2021,
        trailer_url: null,
        genres: null,
        moods: null,
        genres_locked: false,
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
        overview: null,
        year: null,
        trailer_url: null,
        genres: null,
        moods: null,
        genres_locked: false,
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

    it('persists trailer_url from Trakt full payload when present', () => {
      const api = new Api();
      const models = {
        Watchable: { create: jest.fn().mockReturnValue(Promise.resolve({})) },
        WatchableUrl: { },
      };
      api.createWatchable(models, '1234', {
        type: 'movie',
        movie: {
          ids: { trakt: '1111' },
          title: 'A Movie',
          trailer: 'https://youtube.com/watch?v=abc',
        },
      });
      expect(models.Watchable.create).toHaveBeenCalledWith(
        expect.objectContaining({ trailer_url: 'https://youtube.com/watch?v=abc' }),
      );
    });

    it('persists genres and derived moods from Trakt full payload', () => {
      const api = new Api();
      const models = {
        Watchable: { create: jest.fn().mockReturnValue(Promise.resolve({})) },
        WatchableUrl: { },
      };
      api.createWatchable(models, '1234', {
        type: 'movie',
        movie: {
          ids: { trakt: '1111' },
          title: 'A Movie',
          genres: ['Comedy', 'Romance'],
        },
      });
      expect(models.Watchable.create).toHaveBeenCalledWith(
        expect.objectContaining({
          genres: ['comedy', 'romance'],
          moods: expect.arrayContaining(['light', 'date_night', 'comfort']),
        }),
      );
    });
  });

  describe('updateWatchable', () => {
    it('updates trailer_url from Trakt full payload', async () => {
      const api = new Api();
      const watchable = {
        save: jest.fn().mockResolvedValue(undefined),
      };
      await api.updateWatchable({
        type: 'show',
        show: {
          homepage: 'https://example.com',
          overview: 'synopsis',
          year: 2020,
          trailer: 'https://youtu.be/xyz',
          ids: { imdb: 'tt1', tmdb: 2 },
        },
      }, watchable);
      expect(watchable.trailer_url).toBe('https://youtu.be/xyz');
      expect(watchable.overview).toBe('synopsis');
      expect(watchable.save).toHaveBeenCalled();
    });

    it('clears trailer_url when Trakt omits trailer', async () => {
      const api = new Api();
      const watchable = {
        trailer_url: 'https://youtu.be/old',
        save: jest.fn().mockResolvedValue(undefined),
      };
      await api.updateWatchable({
        type: 'movie',
        movie: { ids: {} },
      }, watchable);
      expect(watchable.trailer_url).toBeNull();
    });

    it('updates genres and moods from Trakt full payload', async () => {
      const api = new Api();
      const watchable = {
        genres_locked: false,
        save: jest.fn().mockResolvedValue(undefined),
      };
      await api.updateWatchable({
        type: 'movie',
        movie: {
          ids: {},
          genres: ['Horror'],
        },
      }, watchable, null, { horror: ['scary'] });
      expect(watchable.genres).toEqual(['horror']);
      expect(watchable.moods).toEqual(['scary']);
    });

    it('preserves locked genres on refresh but recomputes moods', async () => {
      const api = new Api();
      const watchable = {
        genres_locked: true,
        genres: ['comedy'],
        moods: ['light'],
        save: jest.fn().mockResolvedValue(undefined),
      };
      await api.updateWatchable({
        type: 'movie',
        movie: {
          ids: {},
          genres: ['Horror'],
        },
      }, watchable, null, { comedy: ['comfort'], horror: ['scary'] });
      expect(watchable.genres).toEqual(['comedy']);
      expect(watchable.moods).toEqual(['comfort']);
    });
  });

  describe('refresh', () => {
    it('creates watchables that are only present in later Trakt pages', async () => {
      const api = new Api();
      api.touchRefresh = jest.fn().mockResolvedValue(undefined);
      api.refreshEpisodes = jest.fn().mockResolvedValue(undefined);
      api.prefetchMissingPosters = jest.fn().mockResolvedValue(undefined);
      api.syncStreamingServiceIds = jest.fn().mockResolvedValue(undefined);
      api.updateWatchable = jest.fn().mockResolvedValue(undefined);
      api.createWatchable = jest.fn().mockResolvedValue(undefined);
      api.traktClient = {
        importToken: jest.fn().mockResolvedValue(undefined),
        getListItems: jest.fn().mockResolvedValue([
          {
            type: 'movie',
            movie: { ids: { trakt: 111 }, title: 'Existing Item' },
          },
          {
            type: 'show',
            show: { ids: { trakt: 222 }, title: 'Page 2 Item' },
          },
        ]),
      };
      const req = {
        user: { access_token: 'token' },
        models: {
          GenreMoodMap: { findAll: jest.fn().mockResolvedValue([]) },
        },
      };
      const existingWatchables = [
        { trakt_id: '111', local: false, destroy: jest.fn() },
      ];

      await api.refresh(req, 'alice', 'list-1', existingWatchables);

      expect(api.createWatchable).toHaveBeenCalledWith(
        req.models,
        'list-1',
        expect.objectContaining({
          type: 'show',
        }),
        'alice',
        expect.any(Object),
      );
    });
  });

  describe('maybeRefreshIfStale', () => {
    const listId = 'list-1';
    const listUser = 'alice';

    function buildReq(watchables) {
      return {
        user: { access_token: 'token' },
        models: {
          Watchable: {
            findAll: jest.fn().mockResolvedValue(watchables),
          },
        },
      };
    }

    it('does not refresh when lastRefresh is fresh', async () => {
      const api = new Api();
      api.lastRefresh = jest.fn().mockResolvedValue(new Date());
      api.refresh = jest.fn();
      api.refreshInBackground = jest.fn();
      const req = buildReq([{ trakt_id: '1' }]);

      const result = await api.maybeRefreshIfStale(req, listUser, listId);

      expect(result).toEqual({ awaited: false });
      expect(api.refresh).not.toHaveBeenCalled();
      expect(api.refreshInBackground).not.toHaveBeenCalled();
      expect(req.models.Watchable.findAll).not.toHaveBeenCalled();
    });

    it('starts background refresh when stale and list is non-empty', async () => {
      const api = new Api();
      api.lastRefresh = jest.fn().mockResolvedValue(new Date(Date.now() - Api.STALE_REFRESH_MS - 1000));
      let resolveRefresh;
      const refreshDone = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      api.refresh = jest.fn().mockReturnValue(refreshDone);
      const watchables = [{ trakt_id: '1' }];
      const req = buildReq(watchables);

      const resultPromise = api.maybeRefreshIfStale(req, listUser, listId);
      const result = await resultPromise;

      expect(result).toEqual({ awaited: false });
      expect(api.refresh).toHaveBeenCalledWith(req, listUser, listId, watchables);
      // Helper returned before refresh completed
      expect(resolveRefresh).toBeDefined();
      resolveRefresh();
      await refreshDone;
    });

    it('awaits refresh when stale and list is empty', async () => {
      const api = new Api();
      api.lastRefresh = jest.fn().mockResolvedValue(new Date(1970, 1, 1));
      let resolveRefresh;
      let helperSettled = false;
      api.refresh = jest.fn().mockImplementation(() => new Promise((resolve) => {
        resolveRefresh = resolve;
      }));
      const req = buildReq([]);

      const resultPromise = api.maybeRefreshIfStale(req, listUser, listId).then((r) => {
        helperSettled = true;
        return r;
      });

      // Flush until refresh() has been entered (await findAll + await refresh start)
      for (let i = 0; i < 10 && !resolveRefresh; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
      }
      expect(resolveRefresh).toBeDefined();
      expect(helperSettled).toBe(false);

      resolveRefresh();
      const result = await resultPromise;
      expect(result).toEqual({ awaited: true });
      expect(api.refresh).toHaveBeenCalledWith(req, listUser, listId, []);
    });
  });

  describe('handleError', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('sends err.status and does not report 4xx to Sentry', () => {
      jest.spyOn(Sentry, 'captureException').mockImplementation(() => {});
      const api = new Api();
      const res = { status: jest.fn(() => res), send: jest.fn(() => res) };
      const err = new Error('Unsupported streaming URL: https://example.com/video');
      err.status = 400;
      api.handleError(res, err);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('sends 500 and reports to Sentry when status is missing', () => {
      jest.spyOn(Sentry, 'captureException').mockImplementation(() => {});
      const api = new Api();
      const res = { status: jest.fn(() => res), send: jest.fn(() => res) };
      const err = new Error('boom');
      api.handleError(res, err);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });
  });
});
