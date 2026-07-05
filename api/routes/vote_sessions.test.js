// global test, expect, describe, it, jest
const mountVoteSessionRoutes = require('./vote_sessions');

jest.mock('../auth/require_auth', () => ({
  createRequireAuth: () => (req, res, next) => next(),
}));

describe('vote_sessions routes', () => {
  it('registers vote session endpoints', () => {
    const post = jest.fn();
    const get = jest.fn();
    const apiRouter = { post, get };
    mountVoteSessionRoutes(apiRouter, {
      authProvider: { requireLogin: jest.fn() },
      receiverFactory: {},
      traktClient: {},
      playWatchable: jest.fn(),
    });
    expect(post).toHaveBeenCalledWith('/vote-sessions', expect.any(Function), expect.any(Function));
    expect(get).toHaveBeenCalledWith('/vote-sessions/:code', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/join', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/start', expect.any(Function), expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/vote', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/cancel', expect.any(Function), expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/play-winner', expect.any(Function), expect.any(Function));
  });
});
