// global test, expect, describe, it, jest
const TraktOauthProvider = require('./trakt_oauth_provider');
const { isSafeReturnTo } = require('./trakt_oauth_provider');

describe('isSafeReturnTo', () => {
  it('accepts same-origin relative paths', () => {
    expect(isSafeReturnTo('/vote/ABC123')).toBe(true);
    expect(isSafeReturnTo('/watchable/42?tab=info')).toBe(true);
  });

  it('rejects open redirects', () => {
    expect(isSafeReturnTo('//evil.com')).toBe(false);
    expect(isSafeReturnTo('https://evil.com')).toBe(false);
    expect(isSafeReturnTo('http://evil.com/path')).toBe(false);
    expect(isSafeReturnTo('')).toBe(false);
    expect(isSafeReturnTo(null)).toBe(false);
  });
});

describe('redirect', () => {
  it('should redirect to trakt endpoint', () => {
    const req = { params: {}, query: {}, session: {} };
    const res = {
      redirect: jest.fn(() => res),
    };
    const oauthProvider = new TraktOauthProvider();
    oauthProvider.redirect(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/api/auth/trakt');
  });

  it('stores a safe returnTo in session', () => {
    const req = { params: {}, query: { returnTo: '/vote/ABC123' }, session: {} };
    const res = {
      redirect: jest.fn(() => res),
    };
    const oauthProvider = new TraktOauthProvider();
    oauthProvider.redirect(req, res);
    expect(req.session.returnTo).toBe('/vote/ABC123');
    expect(res.redirect).toHaveBeenCalledWith('/api/auth/trakt');
  });

  it('ignores unsafe returnTo values', () => {
    const req = { params: {}, query: { returnTo: '//evil.com' }, session: {} };
    const res = {
      redirect: jest.fn(() => res),
    };
    const oauthProvider = new TraktOauthProvider();
    oauthProvider.redirect(req, res);
    expect(req.session.returnTo).toBeUndefined();
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
    expect(req.session.returnTo).toBeUndefined();
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
