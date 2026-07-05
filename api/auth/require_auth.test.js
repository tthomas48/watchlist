// global test, expect, describe, it, jest
const { createRequireAuth, parseBearerToken } = require('./require_auth');

describe('parseBearerToken', () => {
  it('extracts token from Authorization header', () => {
    const req = { headers: { authorization: 'Bearer abc123' } };
    expect(parseBearerToken(req)).toBe('abc123');
  });

  it('returns null when header missing', () => {
    expect(parseBearerToken({ headers: {} })).toBeNull();
  });
});

describe('createRequireAuth', () => {
  it('calls next when session user exists', async () => {
    const authProvider = { authenticateAccessToken: jest.fn() };
    const requireAuth = createRequireAuth(authProvider);
    const req = { user: { id: 1 }, models: {} };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(authProvider.authenticateAccessToken).not.toHaveBeenCalled();
  });

  it('authenticates Bearer token and sets req.user', async () => {
    const user = { id: 2 };
    const authProvider = {
      authenticateAccessToken: jest.fn().mockResolvedValue(user),
    };
    const requireAuth = createRequireAuth(authProvider);
    const req = {
      headers: { authorization: 'Bearer tok' },
      models: {},
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    await requireAuth(req, res, next);
    expect(authProvider.authenticateAccessToken).toHaveBeenCalledWith({}, 'tok');
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 without session or bearer', async () => {
    const requireAuth = createRequireAuth({ authenticateAccessToken: jest.fn() });
    const req = { headers: {}, models: {} };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
