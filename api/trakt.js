const debug = require('debug')('watchlist:api:trakt');
const axios = require('axios');

async function getWatchlist(clientId, user, traktListUserId, traktListId) {
  try {
    const response = await axios.get(`https://api.trakt.tv/users/${traktListUserId}/lists/${traktListId}/items/`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId,
        Authorization: `Bearer ${user.access_token}`,
      },
    });
    if (response.status === 200) {
      return response.data;
    }
    debug(response);
    return [];
  } catch (e) {
    // FIXME: Handle this error better
    debug(e);
    return [];
  }
}

module.exports = {
  getWatchlist,
};
