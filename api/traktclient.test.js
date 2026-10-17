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

  describe('getVideos', () => {
    it('calls movies videos endpoint', async () => {
      const call = jest.fn().mockResolvedValue([{ type: 'trailer', url: 'https://youtu.be/x' }]);
      const client = new TraktClient('id', 'secret');
      // eslint-disable-next-line no-underscore-dangle
      client.traktClient = { _call: call };

      const videos = await client.getVideos('movie', 123);
      expect(videos).toHaveLength(1);
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', url: '/movies/:id/videos' }),
        { id: 123 },
      );
    });

    it('calls shows videos endpoint', async () => {
      const call = jest.fn().mockResolvedValue([]);
      const client = new TraktClient('id', 'secret');
      // eslint-disable-next-line no-underscore-dangle
      client.traktClient = { _call: call };

      await client.getVideos('show', 'slug');
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/shows/:id/videos' }),
        { id: 'slug' },
      );
    });
  });
});
