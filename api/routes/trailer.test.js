// global test, expect, describe, it, jest
const mountTrailerRoutes = require('./trailer');

function invokeGetHandler(apiRouter, path, req) {
  const get = apiRouter.get.mock.calls.find((c) => c[0] === path);
  expect(get).toBeTruthy();
  const handler = get[get.length - 1];
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve(this);
        return this;
      },
    };
    handler(req, res, (err) => {
      if (err) {
        reject(err);
      }
    });
  });
}

describe('trailer routes', () => {
  it('registers GET /watchables/:id/trailer', () => {
    const get = jest.fn();
    const apiRouter = { get };
    const requireLogin = jest.fn();
    mountTrailerRoutes(apiRouter, {
      authProvider: { requireLogin },
      traktClient: {},
    });
    expect(get).toHaveBeenCalledWith(
      '/watchables/:id/trailer',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('returns DB trailer_url without Trakt lookup', async () => {
    const get = jest.fn();
    const apiRouter = { get };
    mountTrailerRoutes(apiRouter, {
      authProvider: { requireLogin: (_r, _s, next) => next() },
      traktClient: { getVideos: jest.fn() },
    });
    const watchable = {
      trailer_url: 'https://youtu.be/cached',
      save: jest.fn(),
    };
    const res = await invokeGetHandler(apiRouter, '/watchables/:id/trailer', {
      params: { id: '1' },
      models: { Watchable: { findByPk: jest.fn().mockResolvedValue(watchable) } },
      user: { access_token: 'tok' },
    });
    expect(res.body).toEqual({ trailerUrl: 'https://youtu.be/cached' });
    expect(watchable.save).not.toHaveBeenCalled();
  });

  it('looks up Trakt videos and write-through persists', async () => {
    const get = jest.fn();
    const apiRouter = { get };
    const getVideos = jest.fn().mockResolvedValue([
      {
        type: 'trailer',
        official: true,
        site: 'youtube',
        url: 'https://youtu.be/live',
      },
    ]);
    const traktClient = {
      importToken: jest.fn().mockResolvedValue(undefined),
      getVideos,
    };
    mountTrailerRoutes(apiRouter, {
      authProvider: { requireLogin: (_r, _s, next) => next() },
      traktClient,
    });
    const watchable = {
      trailer_url: null,
      media_type: 'movie',
      trakt_id: '123',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const res = await invokeGetHandler(apiRouter, '/watchables/:id/trailer', {
      params: { id: '9' },
      models: { Watchable: { findByPk: jest.fn().mockResolvedValue(watchable) } },
      user: { access_token: 'tok' },
    });
    expect(traktClient.importToken).toHaveBeenCalledWith('tok');
    expect(getVideos).toHaveBeenCalledWith('movie', '123');
    expect(watchable.trailer_url).toBe('https://youtu.be/live');
    expect(watchable.save).toHaveBeenCalled();
    expect(res.body).toEqual({ trailerUrl: 'https://youtu.be/live' });
  });

  it('returns null when no trailer found', async () => {
    const get = jest.fn();
    const apiRouter = { get };
    mountTrailerRoutes(apiRouter, {
      authProvider: { requireLogin: (_r, _s, next) => next() },
      traktClient: {
        importToken: jest.fn().mockResolvedValue(undefined),
        getVideos: jest.fn().mockResolvedValue([]),
      },
    });
    const watchable = {
      trailer_url: null,
      media_type: 'show',
      trakt_id: '55',
      save: jest.fn(),
    };
    const res = await invokeGetHandler(apiRouter, '/watchables/:id/trailer', {
      params: { id: '2' },
      models: { Watchable: { findByPk: jest.fn().mockResolvedValue(watchable) } },
      user: { access_token: 'tok' },
    });
    expect(res.body).toEqual({ trailerUrl: null });
    expect(watchable.save).not.toHaveBeenCalled();
  });
});
