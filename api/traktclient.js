const debug = require('debug')('watchlist:api:trakt');
const Trakt = require('trakt.tv');
const TraktImages = require('trakt.tv-images');
const TraktQueued = require('trakt.tv-queued');

class TraktClient {
  constructor(clientId, clientSecret) {
    this.traktClient = new Trakt({
      client_id: clientId,
      client_secret: clientSecret,
      plugins: {
        images: TraktImages,
        queued: TraktQueued,
      },
      options: {
        images: {
          tmdbApiKey: process.env.IMG_TMDB_APIKEY,
          tvdbApiKey: process.env.IMG_TVDB_APIKEY,
          fanartApiKey: process.env.IMG_FANART_APIKEY,
          smallerImages: true, // reduce image size, save bandwidth. defaults to false.
          cached: true, // requires trakt.tv-cached
        },
        queued: {
          concurrency: 5,
          delay: 0.5,
        },
      },
    }, true);
  }

  async importToken(accessToken) {
    await this.traktClient.import_token({ access_token: accessToken });
  }

  async getProfile() {
    return this.traktClient.users.profile({ username: 'me' });
  }

  async getListItems(traktListId, traktUserId) {
    return this.traktClient.users.list.items.get({
      id: traktListId,
      username: traktUserId,
      extended: 'full',
    });
  }

  async findWatchable(watchable) {
    return this.traktClient.search.id({ id_type: 'trakt', id: watchable.trakt_id, type: watchable.media_type });
  }

  async getImages(ids) {
    return this.traktClient.images.get(ids);
  }

  async getLists(traktUserId) {
    return this.traktClient.users.lists.get({ username: traktUserId });
  }

  async getCollaborations(traktUserId) {
    return this.traktClient.users.lists.collaborations({ username: traktUserId });
  }

  async getSeasons(traktId) {
    return this.traktClient.seasons.summary({ id: traktId, extended: 'episodes' });
  }

  async getEpisode(traktId, seasonId, episodeId) {
    return this.traktClient.episodes.summary({ id: traktId, season: seasonId, episode: episodeId });
  }

  async setWatched(traktUserId, traktType, traktId) {
    const options = {
      username: traktUserId,
    };
    options[traktType] = { ids: { trakt: traktId } };
    return this.traktClient.checkin.add(options);
  }

  async getWatched(traktUserId, traktId) {
    return this.traktClient.users.watched({ id: traktId, username: traktUserId });
  }
}

module.exports = TraktClient;
