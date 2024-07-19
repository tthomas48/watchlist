// global test, expect, describe, it
const axios = require('axios');
const trakt = require('./traktclient');

jest.mock('axios');

describe('getWatchlist', () => {
  const clientId = 'clientId';
  const user = { accessToken: 'accessToken' };
  const traktListUserId = 100;
  const traktListId = 200;
  const data = [
    {
      movie: {
        title: 'movie title',
        ids: {
          trakt: 123,
        },
      },
    },
    {
      show: {
        title: 'show title',
        ids: {
          trakt: 456,
        },
      },
    },
  ];

  it('should return empty array on error', async () => {
    axios.get.mockImplementationOnce(() => Promise.resolve({ status: 200, data }));
    const watchlist = await trakt.getWatchlist(clientId, user, traktListUserId, traktListId);
    expect(watchlist).toEqual(data);
  });

  it ('should return empty array on not found', async () => {
    axios.get.mockImplementationOnce(() => Promise.resolve({ status: 404, data: { message: 'not found' } }));
    const watchlist = await trakt.getWatchlist(clientId, user, traktListUserId, traktListId);
    expect(watchlist).toEqual([]);
  });

  it('should return list on success', async () => {
    axios.get.mockImplementationOnce(() => Promise.reject(new Error('http error')));
    const watchlist = await trakt.getWatchlist(clientId, user, traktListUserId, traktListId);
    expect(watchlist).toEqual([]);
  });
});
