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
    const limit = 100;
    const out = [];
    let page = 1;
    let totalPages = null;
    while (true) {
      // Explicit pagination avoids default page-size drift on Trakt endpoints.
      // Keep `limit` conservative for compatibility across deployments.
      // eslint-disable-next-line no-await-in-loop
      const response = await this.traktClient.users.list.items.get({
        id: traktListId,
        username: traktUserId,
        extended: 'full',
        page,
        limit,
      });
      const items = this.extractPagedItems(response);
      out.push(...items);
      totalPages = this.extractTotalPages(response, totalPages);
      if (items.length === 0) {
        break;
      }
      if (totalPages != null && page >= totalPages) {
        break;
      }
      if (items.length < limit) {
        break;
      }
      page += 1;
    }
    return out;
  }

  extractPagedItems(response) {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.results)) {
      return response.results;
    }
    return [];
  }

  extractTotalPages(response, fallback) {
    if (Number.isFinite(response?.pagination?.page_count)) {
      return Number(response.pagination.page_count);
    }
    if (Number.isFinite(response?.pagination?.pageCount)) {
      return Number(response.pagination.pageCount);
    }
    if (Number.isFinite(response?.page_count)) {
      return Number(response.page_count);
    }
    if (Number.isFinite(response?.pageCount)) {
      return Number(response.pageCount);
    }
    return fallback ?? null;
  }

  async findWatchable(watchable) {
    return this.traktClient.search.id({ id_type: 'trakt', id: watchable.trakt_id, type: watchable.media_type });
  }

  /**
   * Resolve a movie or show by Trakt id (for validation / hydration).
   * @param {'movie'|'show'} mediaType
   * @param {string|number} traktId
   * @returns {Promise<Array>} Trakt search.id rows, e.g. [{ movie: {...} }].
   */
  async searchByTraktId(mediaType, traktId) {
    const id = Number(traktId);
    if (!Number.isFinite(id) || id < 1) {
      throw new Error('invalid trakt id');
    }
    const t = mediaType === 'show' || mediaType === 'movie' ? mediaType : null;
    if (!t) {
      throw new Error('type must be movie or show');
    }
    return this.traktClient.search.id({ id_type: 'trakt', id, type: t });
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
    options[`${traktType}s`] = [{ ids: { trakt: traktId } }];
    return this.traktClient.sync.history.add(options);
  }

  async getWatched(traktUserId, traktId) {
    return this.traktClient.users.watched({ id: traktId, username: traktUserId });
  }

  /**
   * Trakt text search. `type` e.g. "movie,show" or "person".
   * @param {string} [opts.fields] - Trakt search fields, e.g. "title,overview,people".
   * @param {number} [opts.limit]
   * @param {number} [opts.page]
   * @param {boolean} [opts.pagination] - If true, client wraps response with pagination metadata.
   */
  async searchText(query, type = 'movie,show', opts = {}) {
    const params = {
      query,
      type,
      extended: 'full',
    };
    const fields = opts.fields != null ? String(opts.fields).trim() : '';
    if (fields) {
      params.fields = fields;
    }
    if (opts.limit != null && opts.limit !== '') {
      params.limit = Number(opts.limit);
    }
    if (opts.page != null && opts.page !== '') {
      params.page = Number(opts.page);
    }
    if (opts.pagination === true) {
      params.pagination = true;
    }
    return this.traktClient.search.text(params);
  }

  /**
   * @param {string|number} id - Trakt slug or numeric id
   * @returns {Promise<object>} Trakt people summary
   */
  async peopleSummary(id) {
    return this.traktClient.people.summary({ id, extended: 'full' });
  }

  /**
   * @param {string|number} id - Trakt slug or numeric id
   */
  async peopleMoviesFromPerson(id) {
    return this.traktClient.people.movies({ id, extended: 'full' });
  }

  /**
   * @param {string|number} id - Trakt slug or numeric id
   */
  async peopleShowsFromPerson(id) {
    return this.traktClient.people.shows({ id, extended: 'full' });
  }

  /**
   * @param {string|number} id - Movie slug or numeric trakt id
   */
  async moviePeople(id) {
    return this.traktClient.movies.people({ id, extended: 'full' });
  }

  /**
   * @param {string|number} id - Show slug or numeric trakt id
   */
  async showPeople(id) {
    return this.traktClient.shows.people({ id, extended: 'full' });
  }

  /**
   * Personalized movie recommendations (OAuth).
   * @param {number} [opts.limit]
   * @param {boolean|string} [opts.ignore_collected]
   */
  async getRecommendationsMovies(opts = {}) {
    const params = { extended: 'full' };
    if (opts.limit != null && opts.limit !== '') {
      params.limit = Number(opts.limit);
    }
    if (opts.ignore_collected !== undefined && opts.ignore_collected !== null) {
      params.ignore_collected = opts.ignore_collected;
    }
    return this.traktClient.recommendations.movies.get(params);
  }

  /**
   * Personalized show recommendations (OAuth).
   */
  async getRecommendationsShows(opts = {}) {
    const params = { extended: 'full' };
    if (opts.limit != null && opts.limit !== '') {
      params.limit = Number(opts.limit);
    }
    if (opts.ignore_collected !== undefined && opts.ignore_collected !== null) {
      params.ignore_collected = opts.ignore_collected;
    }
    return this.traktClient.recommendations.shows.get(params);
  }

  /**
   * Add items to a user list.
   * Body: { movies: [...], shows: [...], people: [...] }.
   */
  async addListItems(username, listId, body) {
    return this.traktClient.users.list.items.add({
      username,
      id: listId,
      ...body,
    });
  }

  /**
   * Remove items from a user list. Body: { movies: [...], shows: [...], people: [...] }.
   */
  async removeListItems(username, listId, body) {
    return this.traktClient.users.list.items.remove({
      username,
      id: listId,
      ...body,
    });
  }
}

module.exports = TraktClient;
