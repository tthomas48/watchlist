// global test, expect, describe, it, jest
const mountRogerEbertRoutes = require('./rogerebert');

describe('rogerebert routes', () => {
  it('registers lookup route', () => {
    const post = jest.fn();
    const apiRouter = { post };
    const requireLogin = jest.fn();
    mountRogerEbertRoutes(apiRouter, {
      authProvider: { requireLogin },
    });
    expect(post).toHaveBeenCalledWith(
      '/watchables/:id/rogerebert-lookup',
      expect.any(Function),
      expect.any(Function),
    );
  });
});
