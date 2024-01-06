// global test, expect, describe, it, jest
const TraktOauthProvider = require('./trakt_oauth_provider');

describe('redirect', () => {
  it('should redirect to trakt endpoint', () => {
    const req = { params: {} };
    const res = {
      redirect: jest.fn(() => res),
    };
    const oauthProvider = new TraktOauthProvider();
    oauthProvider.redirect(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/api/auth/trakt');
  });
});

describe('callback', () => {
  it('should redirect to returnTo if set', () => {
    const req = { session: { returnTo: '/returnTo' } };
    const res = {
      redirect: jest.fn(() => res),
    };
    const oauthProvider = new TraktOauthProvider();
    oauthProvider.callback(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/returnTo');
  });
  it('should redirect to / if returnTo is not set', () => {
    const req = { session: {} };
    const res = {
      redirect: jest.fn(() => res),
    };
    const oauthProvider = new TraktOauthProvider();
    oauthProvider.callback(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});
