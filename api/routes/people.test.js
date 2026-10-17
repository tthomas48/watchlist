const mountPeopleRoutes = require('./people');

describe('people routes', () => {
  it('registers people CRUD and avatar endpoints', () => {
    const get = jest.fn();
    const post = jest.fn();
    const patch = jest.fn();
    const del = jest.fn();
    mountPeopleRoutes({
      get, post, patch, delete: del,
    }, {
      authProvider: { requireLogin: jest.fn((req, res, next) => next()) },
    });
    expect(get).toHaveBeenCalledWith('/people', expect.any(Function), expect.any(Function));
    expect(post).toHaveBeenCalledWith('/people', expect.any(Function), expect.any(Function));
    expect(patch).toHaveBeenCalledWith('/people/:id', expect.any(Function), expect.any(Function));
    expect(del).toHaveBeenCalledWith('/people/:id', expect.any(Function), expect.any(Function));
    expect(post).toHaveBeenCalledWith(
      '/people/:id/avatar',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(get).toHaveBeenCalledWith(
      '/img/people/:id',
      expect.any(Function),
      expect.any(Function),
    );
  });
});
