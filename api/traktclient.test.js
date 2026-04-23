const TraktClient = require('./traktclient');

describe('TraktClient', () => {
  describe('getListItems', () => {
    it('fetches and combines paginated responses', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `p1-${i}` }));
      const page2 = [{ id: 'c' }];
      const get = jest.fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);
      const client = new TraktClient('id', 'secret');
      client.traktClient = {
        users: { list: { items: { get } } },
      };

      const results = await client.getListItems('list-1', 'alice');

      expect(results).toEqual([...page1, ...page2]);
      expect(get).toHaveBeenNthCalledWith(1, expect.objectContaining({
        id: 'list-1',
        username: 'alice',
        page: 1,
        limit: 100,
      }));
      expect(get).toHaveBeenNthCalledWith(2, expect.objectContaining({
        id: 'list-1',
        username: 'alice',
        page: 2,
        limit: 100,
      }));
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('uses pagination page_count when available', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `p1-${i}` }));
      const get = jest.fn()
        .mockResolvedValueOnce({
          data: page1,
          pagination: { page_count: 2 },
        })
        .mockResolvedValueOnce({
          data: [{ id: 'b' }],
          pagination: { page_count: 2 },
        })
        .mockResolvedValueOnce({
          data: [{ id: 'c' }],
          pagination: { page_count: 2 },
        });
      const client = new TraktClient('id', 'secret');
      client.traktClient = {
        users: { list: { items: { get } } },
      };

      const results = await client.getListItems('list-1', 'alice');

      expect(results).toEqual([...page1, { id: 'b' }]);
      expect(get).toHaveBeenCalledTimes(2);
    });
  });
});
