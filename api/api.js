const debug = require('debug')('watchlist:api');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const { pipeline } = require('stream/promises');
const axios = require('axios');
const singleflight = require('node-singleflight');
const Sentry = require('@sentry/node');
const TraktClient = require('./traktclient');
const {
  getTitle, getTraktId, getTraktIds, listedAtFromTraktItem,
} = require('./helpers');
const {
  MAX_RECOMMENDATION_FETCH,
  traktIdsFromRecommendationItems,
  sortSearchResultsByRecommendationIds,
} = require('./trakt_search_rank');
const { getCapabilities } = require('./capabilities');
const { fetchShowStreaming } = require('./streaming_availability_client');
const {
  parseUserStreamingAccess,
  filterStreamingOptionsByMode,
  normalizeStreamingFilterMode,
  logCountryMismatch,
} = require('./streaming_options_filter');
const {
  extractRentalOptions,
  refreshWatchableStreamingSnapshot,
  isStreamingSnapshotStale,
  streamingSummaryFromWatchable,
  needsMotNStreamingRefresh,
  applyPlayUrlFromStoredSnapshot,
} = require('./streaming_snapshot');
const { loadStreamingManifest } = require('./streaming_manifest');
const {
  getOrCreateUserStreamingAccess,
  parseAccessResponse,
  serializePutBody,
} = require('./streaming_access_service');
const ProviderFactory = require('../receiver/providers/factory');
const posterHelper = require('./poster_helper');
const {
  traktPosterDiskPath,
  normalizeTraktPosterMediaType,
  parseTraktIdParam,
} = require('./poster_trakt_cache');
const mountVoteSessionRoutes = require('./routes/vote_sessions');
const mountRogerEbertRoutes = require('./routes/rogerebert');
const mountTrailerRoutes = require('./routes/trailer');
const mountPeopleRoutes = require('./routes/people');
const { normalizeTrailerField } = require('./trailer');
const posterServe = require('./poster_serve');
const {
  serveWatchablePoster,
  localPosterIsDefaultPlaceholder,
  localPosterPath,
  defaultPosterImagePath,
} = posterServe;
const {
  normalizeGenres,
  moodsFromGenres,
  loadGenreMoodMap,
} = require('./mood_map');
const {
  getMoodsPayload,
  getGenresPayload,
  ensureGenre,
  replaceMoodsAndMappings,
  applyWatchableGenres,
} = require('./moods_service');
const { buildWatchlistWhere, parseListFilters } = require('./watchlist_filters');
const { watchlistSortOrder } = require('./watchlist_sort');
const {
  setWatchablePeople,
  recommendersInclude,
  watchableToBrowseJson,
} = require('./people_service');

function parseBoolQuery(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const s = String(value).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

/** @param {unknown} value @param {{ min?: number, max?: number }} [bounds] */
function parseOptionalIntQuery(value, bounds = {}) {
  const min = bounds.min ?? 1;
  const max = bounds.max ?? 100;
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) {
    return undefined;
  }
  return Math.min(max, Math.max(min, n));
}

class Api {
  constructor(authProvider, receiverFactory) {
    this.authProvider = authProvider;
    this.receiverFactory = receiverFactory;
    // we would only expect this in tests
    if (this.authProvider && this.authProvider.getClientId) {
      this.traktClient = new TraktClient(
        this.authProvider.getClientId(),
        this.authProvider.getClientSecret(),
      );
    }
  }

  handleError(res, err) {
    const status = err.status || 500;
    if (status >= 500) {
      Sentry.captureException(err);
    }
    const msg = JSON.stringify(err, Object.getOwnPropertyNames(err));
    debug(msg);
    res.status(status).send(msg);
  }

  async markWatched(req, watchable) {
    try {
      if (watchable.media_type === 'show') {
        const nextUnwatchedId = await watchable.getNextUnwatchedId();
        if (nextUnwatchedId) {
          debug(`Auto-advancing ${watchable.title}`);
          const episode = await req.models.Episode.findOne({
            where: { watchable_id: watchable.id, id: nextUnwatchedId },
          });
          if (episode) {
            episode.watched = true;
            await episode.save();
          }
          await this.traktClient.setWatched(req.user.trakt_id, 'episode', nextUnwatchedId);
        }
      } else if (!watchable.local) {
        debug(`Auto-advancing ${watchable.title}`);
        await this.traktClient.setWatched(
          req.user.trakt_id,
          watchable.media_type,
          watchable.trakt_id,
        );
      }
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  async playWatchable(req, serviceType, watchable) {
    if (!watchable) {
      const err = new Error('watchable not found');
      err.status = 404;
      throw err;
    }
    watchable.last_played = new Date();
    if (watchable.noautoadvance !== true) {
      await this.markWatched(req, watchable);
    }
    const uri = watchable.web_url;
    if (!uri) {
      const err = new Error(`no url specified for ${watchable.title}`);
      err.status = 400;
      throw err;
    }
    const receiver = this.receiverFactory.getReceiver(serviceType);
    debug(`Playing ${uri} with ${serviceType}`);
    const playResponse = await receiver.play(uri);
    if (playResponse.result) {
      await watchable.save();
      return {
        uri,
        message: `Playing ${watchable.title} with ${serviceType}`,
        ...playResponse,
      };
    }
    throw new Error('unable to play');
  }

  async createWatchable(models, traktListId, traktItem, traktListUserSlug, genreToMoodsMap) {
    const ids = getTraktIds(traktItem);
    const media = traktItem[traktItem.type] || {};
    const genres = normalizeGenres(media.genres);
    const moods = moodsFromGenres(genres, genreToMoodsMap);
    const props = {
      title: getTitle(traktItem),
      trakt_id: getTraktId(traktItem),
      trakt_list_id: traktListId,
      media_type: traktItem.type,
      imdb_id: ids?.imdb,
      tmdb_id: ids?.tmdb,
      homepage: media.homepage,
      overview: media.overview || null,
      year: media.year || null,
      trailer_url: normalizeTrailerField(media.trailer),
      genres: genres.length ? genres : null,
      moods: moods.length ? moods : null,
      genres_locked: false,
      web_url: null,
      streaming_service_id: null,
      streaming_addon_id: null,
    };
    if (traktListUserSlug != null && String(traktListUserSlug).trim() !== '') {
      props.trakt_list_user_slug = traktListUserSlug;
    }
    const addedAt = listedAtFromTraktItem(traktItem);
    if (addedAt) {
      props.added_at = addedAt;
    }
    return models.Watchable.create(props);
  }

  async updateWatchable(traktItem, watchable, traktListUserSlug, genreToMoodsMap) {
    const media = traktItem[traktItem.type] || {};
    watchable.media_type = traktItem.type;
    watchable.homepage = media.homepage;
    watchable.overview = media.overview || null;
    watchable.year = media.year || null;
    watchable.trailer_url = normalizeTrailerField(media.trailer);
    watchable.imdb_id = media.ids?.imdb;
    watchable.tmdb_id = media.ids?.tmdb;
    if (watchable.genres_locked) {
      const lockedGenres = normalizeGenres(watchable.genres);
      const moods = moodsFromGenres(lockedGenres, genreToMoodsMap);
      watchable.moods = moods.length ? moods : null;
    } else {
      const genres = normalizeGenres(media.genres);
      const moods = moodsFromGenres(genres, genreToMoodsMap);
      watchable.genres = genres.length ? genres : null;
      watchable.moods = moods.length ? moods : null;
    }
    if (traktListUserSlug != null && String(traktListUserSlug).trim() !== '') {
      watchable.trakt_list_user_slug = traktListUserSlug;
    }
    const addedAt = listedAtFromTraktItem(traktItem);
    if (addedAt) {
      watchable.added_at = addedAt;
    }
    return watchable.save();
  }

  async getLastRefresh(models, traktListId) {
    let refreshStatusModel = await models.RefreshStatus.findOne({
      where: {
        trakt_list_id: traktListId,
      },
    });
    if (!refreshStatusModel) {
      refreshStatusModel = models.RefreshStatus.build({
        lastRefresh: new Date(1970, 1, 1),
        trakt_list_id: traktListId,
      });
    }
    return refreshStatusModel;
  }

  async lastRefresh(models, traktListId) {
    const refreshStatusModel = await this.getLastRefresh(models, traktListId);
    return refreshStatusModel.lastRefresh;
  }

  async touchRefresh(models, traktListId) {
    const refreshStatusModel = await this.getLastRefresh(models, traktListId);
    refreshStatusModel.lastRefresh = new Date();
    return refreshStatusModel.save();
  }

  /** Rolling window after which GET /watchlist may sync from Trakt again. */
  static get STALE_REFRESH_MS() {
    return 1000 * 60 * 60 * 24;
  }

  /**
   * Start a Trakt list refresh without awaiting; log and report failures so the
   * floating promise does not become an unhandled rejection.
   */
  refreshInBackground(req, traktListUserId, traktListId, existingWatchables) {
    this.refresh(req, traktListUserId, traktListId, existingWatchables).catch((e) => {
      debug('background refresh failed', e);
      Sentry.captureException(e);
    });
  }

  /**
   * If lastRefresh is older than 24h, kick off a Trakt list refresh.
   * When awaitIfEmpty is true and the list has no DB rows, awaits the refresh so a
   * never-synced list is not returned as []. Otherwise starts refresh in the background.
   * @returns {{ awaited: boolean }} true when refresh was awaited (caller should re-query)
   */
  async maybeRefreshIfStale(req, traktListUserId, traktListId, { awaitIfEmpty = true } = {}) {
    const mostRecentUpdate = await this.lastRefresh(req.models, traktListId);
    debug(`Most recent update ${mostRecentUpdate}`);
    const staleCutoff = new Date(Date.now() - Api.STALE_REFRESH_MS);
    if (mostRecentUpdate >= staleCutoff) {
      return { awaited: false };
    }
    debug(`Refreshing because ${mostRecentUpdate} is more than a day ago`);
    const allWatchables = await req.models.Watchable.findAll({
      where: { trakt_list_id: traktListId },
    });
    const shouldAwait = awaitIfEmpty && allWatchables.length === 0;
    if (shouldAwait) {
      await this.refresh(req, traktListUserId, traktListId, allWatchables);
      return { awaited: true };
    }
    this.refreshInBackground(req, traktListUserId, traktListId, allWatchables);
    return { awaited: false };
  }

  /**
   * Writes poster JPEGs after list refresh: skips watchables that already have a non-placeholder
   * file; if the file is byte-identical to images/movie.jpg, tries again to fetch a real poster.
   * When traktItems from getListItems is provided, prefer embedded images.poster on those rows.
   */
  async prefetchMissingPosters(req, traktListId, traktItems = null) {
    const token = req.user?.access_token;
    if (!token) {
      return;
    }
    let watchables;
    try {
      watchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
    } catch (e) {
      debug('prefetchMissingPosters findAll failed', e);
      return;
    }
    await this.traktClient.importToken(token);

    const listByTraktId = new Map();
    if (Array.isArray(traktItems)) {
      for (let i = 0; i < traktItems.length; i += 1) {
        const item = traktItems[i];
        const tid = getTraktId(item);
        if (tid != null && tid !== '') {
          listByTraktId.set(String(tid), item);
        }
      }
    }

    for (let i = 0; i < watchables.length; i += 1) {
      const w = watchables[i];
      if (!w.trakt_id || !w.media_type) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const fullPath = localPosterPath(w.id);
      const haveRealPoster = fs.existsSync(fullPath) && !localPosterIsDefaultPlaceholder(fullPath);
      if (haveRealPoster) {
        // eslint-disable-next-line no-continue
        continue;
      }
      try {
        const fromList = listByTraktId.get(String(w.trakt_id));
        const candidate = fromList || {
          type: w.media_type,
          [w.media_type]: { ids: { trakt: Number(w.trakt_id) } },
        };
        // eslint-disable-next-line no-await-in-loop
        const url = await posterHelper.posterUrlForCandidate(this.traktClient, candidate);
        if (!url) {
          // eslint-disable-next-line no-continue
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        await posterServe.downloadPosterToLocal(w, url);
      } catch (e) {
        debug(`prefetch poster failed watchable ${w.id}: ${e.message}`);
      }
    }
  }

  async addNotification(models, traktListId, watchable, message) {
    debug(watchable);
    await models.Notification.create({
      trakt_list_id: traktListId,
      watchable_id: watchable.id,
      message,
    });
  }

  async refreshEpisodes(models, traktListId) {
    const tasks = [];

    const existingWatchables = await models.Watchable.findAll(
      { where: { trakt_list_id: traktListId } },
    );

    for (let i = 0; i < existingWatchables.length; i += 1) {
      if (existingWatchables[i].media_type === 'show') {
        tasks.push((async () => {
          const watchable = existingWatchables[i];

          const existingEpisodes = await watchable.getEpisodes();
          // get all of our existing episode and season counts
          const existingEpisodeMap = {};
          existingEpisodes.forEach((e) => {
            existingEpisodeMap[e.season] = existingEpisodeMap[e.season] || 0;
            if (e.episode > existingEpisodeMap[e.season]) {
              existingEpisodeMap[e.season] = e.episode;
            }
          });

          const remoteEpisodeMap = {};
          const seasons = await this.traktClient.getSeasons(watchable.trakt_id);
          for (let j = 0; j < seasons.length; j += 1) {
            const season = seasons[j];
            const { episodes } = season;
            // if seasons.length > existingEpisodes.seasons.length then we need to notify new season
            // if episodes.length > existingEpisodes.length then we need to notify new episodes
            for (let k = 0; k < episodes.length; k += 1) {
              const episode = episodes[k];
              const seasonId = episode.season;
              const episodeId = episode.number;
              // collect all remote episode and seasone counts
              remoteEpisodeMap[seasonId] = remoteEpisodeMap[seasonId] || 0;
              if (episodeId > remoteEpisodeMap[seasonId]) {
                remoteEpisodeMap[seasonId] = episodeId;
              }
              const episodeModel = existingEpisodes.find(
                (e) => e.season === seasonId && e.episode === episodeId,
              );
              if (!episodeModel) {
                // eslint-disable-next-line no-await-in-loop
                await models.Episode.create({
                  watchable_id: watchable.id,
                  trakt_id: episode.ids.trakt,
                  season: seasonId,
                  episode: episodeId,
                  title: episode.title,
                });
              }
            }
          }
          // find maximum key in remoteEpisodeMap and existingEpisodeMap
          const maxRemoteSeason = Math.max(...Object.keys(remoteEpisodeMap));
          const maxExistingSeason = Math.max(...Object.keys(existingEpisodeMap));
          if (maxExistingSeason > 0 && maxRemoteSeason > maxExistingSeason) {
            debug(`New season for ${watchable.title}`);
            tasks.push(this.addNotification(models, traktListId, watchable, 'New season.'));
          } else if (maxRemoteSeason === maxExistingSeason) {
            if (remoteEpisodeMap[maxRemoteSeason] > existingEpisodeMap[maxExistingSeason]) {
              debug(`New episodes for ${watchable.title}`);
              tasks.push(this.addNotification(models, traktListId, watchable, 'New episodes.'));
            }
          }
        })());
      }
    }
    return Promise.all(tasks);
  }

  async syncStreamingServiceIds(models, traktListId) {
    const watchables = await models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
    const saves = [];
    for (let i = 0; i < watchables.length; i += 1) {
      const w = watchables[i];
      const resolved = ProviderFactory.resolveStreamingServiceIdFromUrl(w.web_url);
      if (resolved !== w.streaming_service_id) {
        w.streaming_service_id = resolved;
        saves.push(w.save());
      }
    }
    if (saves.length > 0) {
      await Promise.all(saves);
    }
  }

  /**
   * Best-effort MotN subscription snapshots + play-URL backfill (cap MotN per refresh).
   */
  async syncStaleStreamingSnapshots(req, traktListId, { maxItems = 15 } = {}) {
    const userId = req.user?.id;
    if (!userId) {
      return;
    }
    let watchables;
    try {
      watchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
    } catch (e) {
      debug('syncStaleStreamingSnapshots findAll failed', e);
      return;
    }

    // Cheap pass: fill missing play URLs from stored profile subscription links.
    for (let i = 0; i < watchables.length; i += 1) {
      const w = watchables[i];
      try {
        // eslint-disable-next-line no-await-in-loop
        await applyPlayUrlFromStoredSnapshot(w);
      } catch (e) {
        debug(`play url backfill failed watchable ${w.id}: ${e.message}`);
      }
    }

    let refreshed = 0;
    for (let i = 0; i < watchables.length && refreshed < maxItems; i += 1) {
      const w = watchables[i];
      if (!needsMotNStreamingRefresh(w)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        const out = await refreshWatchableStreamingSnapshot(req.models, userId, w);
        if (out?.ok) {
          refreshed += 1;
        }
      } catch (e) {
        debug(`syncStaleStreamingSnapshots failed watchable ${w.id}: ${e.message}`);
      }
    }

    // Second backfill for rows MotN just wrote (or still missing after first pass).
    for (let i = 0; i < watchables.length; i += 1) {
      const w = watchables[i];
      try {
        // eslint-disable-next-line no-await-in-loop
        await applyPlayUrlFromStoredSnapshot(w);
      } catch (e) {
        debug(`play url backfill (post-MotN) failed watchable ${w.id}: ${e.message}`);
      }
    }
  }

  async refresh(req, traktListUserId, traktListId, existingWatchables) {
    let error = null;
    await singleflight.Do(traktListId, async () => {
      try {
        debug('performing refresh');
        // do this first so we don't keep refreshing if there's an error
        await this.touchRefresh(req.models, traktListId);
        const tasks = [];
        await this.traktClient.importToken(req.user.access_token);
        const traktItems = await this.traktClient.getListItems(traktListId, traktListUserId);

        // 2. find all that no longer exist in watchables
        const existingTraktIds = traktItems.map((traktItem) => getTraktId(traktItem));
        const existingWatchableTraktIds = existingWatchables.map((watchable) => watchable.trakt_id);
        const deletedItems = existingWatchables.filter(
          (watchable) => !existingTraktIds.includes(watchable.trakt_id) && !watchable.local,
        );
        const updateItems = traktItems.filter(
          (traktItem) => existingWatchableTraktIds.includes(getTraktId(traktItem)),
        );
        const newItems = traktItems.filter(
          (traktItem) => !existingWatchableTraktIds.includes(getTraktId(traktItem)),
        );

        // 3. delete them
        deletedItems.forEach((deletedItem) => {
          tasks.push(deletedItem.destroy());
        });

        const genreToMoodsMap = await loadGenreMoodMap(req.models);

        updateItems.forEach((traktItem) => {
          const existingWatchable = existingWatchables.find(
            (ew) => getTraktId(traktItem) === ew.trakt_id,
          );
          tasks.push(this.updateWatchable(
            traktItem,
            existingWatchable,
            traktListUserId,
            genreToMoodsMap,
          ));
        });

        newItems.forEach((traktItem) => {
          tasks.push(this.createWatchable(
            req.models,
            traktListId,
            traktItem,
            traktListUserId,
            genreToMoodsMap,
          ));
        });
        await Promise.all(tasks);
        await this.refreshEpisodes(req.models, traktListId);
        await this.prefetchMissingPosters(req, traktListId, traktItems);
        await this.syncStreamingServiceIds(req.models, traktListId);
        await this.syncStaleStreamingSnapshots(req, traktListId);
      } catch (e) {
        Sentry.captureException(e);
        error = e;
      }
    });
    if (error) {
      throw error;
    }
  }

  addRoutes(apiRouter) {
    this.authProvider.addRoutes(apiRouter);

    apiRouter.get('/logout', (req, res) => {
      req.logout();
      res.redirect('/');
    });

    apiRouter.get('/notifications/:trakt_list_id/', this.authProvider.requireLogin, async (req, res) => {
      const traktListId = req.params.trakt_list_id;
      const notifications = await req.models.Notification.findAll({
        where: { trakt_list_id: traktListId },
      });
      res.json(notifications);
    });

    apiRouter.delete('/notifications/:trakt_list_id/:notification_id/', this.authProvider.requireLogin, async (req, res) => {
      const traktListId = req.params.trakt_list_id;
      const notificationId = req.params.notification_id;
      debug('Deleting notification', traktListId, notificationId);
      const notifications = await req.models.Notification.findAll({
        where: { trakt_list_id: traktListId, id: notificationId },
      });
      const tasks = [];
      debug(notifications.length);
      for (let i = 0; i < notifications.length; i += 1) {
        tasks.push(notifications[i].destroy());
      }
      await Promise.all(tasks);
      res.status(204).send();
    });

    // FIXME: should this be a POST since it does something?
    apiRouter.get('/refresh/:trakt_list_user_id/:trakt_list_id/', this.authProvider.requireLogin, async (req, res) => {
      try {
        debug('refresh api');
        const traktListId = req.params.trakt_list_id;
        const traktListUserId = req.params.trakt_list_user_id;
        let existingWatchables = await req.models.Watchable.findAll(
          { where: { trakt_list_id: traktListId } },
        );
        this.refreshInBackground(
          req,
          traktListUserId,
          traktListId,
          existingWatchables,
        );

        existingWatchables = await req.models.Watchable.findAll(
          { where: { trakt_list_id: traktListId } },
        );
        res.json(existingWatchables);
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.get('/lists', this.authProvider.requireLogin, async (req, res) => {
      try {
        const { user } = req;
        await this.traktClient.importToken(user.access_token);
        const response = await this.traktClient.getLists(user.trakt_id);
        const response2 = await this.traktClient.getCollaborations(user.trakt_id);
        const result = response.concat(response2);
        res.json(result);
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.get('/capabilities', this.authProvider.requireLogin, (req, res) => {
      res.json(getCapabilities());
    });

    apiRouter.get('/streaming/availability', this.authProvider.requireLogin, async (req, res) => {
      try {
        const type = (req.query.type || '').trim();
        if (type !== 'movie' && type !== 'show') {
          res.status(400).json({ message: 'type query must be movie or show' });
          return;
        }
        const imdbRaw = req.query.imdb_id ?? req.query.imdbId;
        const tmdbRaw = req.query.tmdb_id ?? req.query.tmdbId;
        const imdbId = imdbRaw !== undefined && imdbRaw !== null && String(imdbRaw).trim() !== ''
          ? String(imdbRaw).trim()
          : undefined;
        const tmdbId = tmdbRaw !== undefined && tmdbRaw !== null && String(tmdbRaw).trim() !== ''
          ? tmdbRaw
          : undefined;
        if (!imdbId && (tmdbId === undefined || tmdbId === null || String(tmdbId).trim() === '')) {
          res.status(400).json({ message: 'imdb_id or tmdb_id required' });
          return;
        }
        const country = (req.query.country || '').trim() || undefined;
        const includeRentals = parseBoolQuery(req.query.includeRentals, false);
        const mode = normalizeStreamingFilterMode(req.query.mode || 'subscription');
        const raw = await fetchShowStreaming({
          imdbId,
          tmdbId,
          mediaType: type,
          country,
        });
        const accessRow = await getOrCreateUserStreamingAccess(req.models, req.user.id);
        logCountryMismatch(
          accessRow.country,
          process.env.STREAMING_AVAILABILITY_COUNTRY || 'us',
        );
        const access = parseUserStreamingAccess(accessRow);
        const filtered = filterStreamingOptionsByMode(raw, { mode, access, includeRentals });
        res.json(filtered);
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.get('/watchables/:id/rentals', this.authProvider.requireLogin, async (req, res) => {
      try {
        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.id },
        });
        if (!watchable) {
          res.status(404).json({ ok: false, reason: 'not_found', message: 'watchable not found' });
          return;
        }
        const mediaType = watchable.media_type === 'show' ? 'show' : 'movie';
        if (!watchable.imdb_id && (watchable.tmdb_id == null || String(watchable.tmdb_id).trim() === '')) {
          res.status(400).json({ ok: false, reason: 'missing_ids', message: 'imdb_id or tmdb_id required' });
          return;
        }
        const accessRow = await getOrCreateUserStreamingAccess(req.models, req.user.id);
        const country = (accessRow.country
          || process.env.STREAMING_AVAILABILITY_COUNTRY
          || 'us').trim().toLowerCase();
        const raw = await fetchShowStreaming({
          imdbId: watchable.imdb_id,
          tmdbId: watchable.tmdb_id,
          mediaType,
          country,
        });
        if (!raw.ok) {
          const status = raw.reason === 'not_configured' ? 503
            : raw.reason === 'missing_ids' ? 400
              : raw.reason === 'not_found' ? 404
                : 502;
          res.status(status).json(raw);
          return;
        }
        res.json({
          ok: true,
          checkedAt: new Date().toISOString(),
          options: extractRentalOptions(raw),
        });
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post('/watchables/:id/streaming/refresh', this.authProvider.requireLogin, async (req, res) => {
      try {
        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.id },
        });
        if (!watchable) {
          res.status(404).json({ ok: false, reason: 'not_found', message: 'watchable not found' });
          return;
        }
        const out = await refreshWatchableStreamingSnapshot(req.models, req.user.id, watchable);
        if (!out.ok) {
          const status = out.reason === 'not_configured' ? 503
            : out.reason === 'missing_ids' ? 400
              : out.reason === 'not_found' ? 404
                : 502;
          res.status(status).json(out);
          return;
        }
        res.json({
          ok: true,
          streaming: streamingSummaryFromWatchable(watchable),
          web_url: watchable.web_url,
          streaming_service_id: watchable.streaming_service_id,
          streaming_addon_id: watchable.streaming_addon_id,
          playUrlUpdated: Boolean(out.playUrlUpdated),
        });
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.get('/trakt/search', this.authProvider.requireLogin, async (req, res) => {
      try {
        const q = (req.query.q || req.query.query || '').trim();
        const type = (req.query.type || 'movie,show').trim();
        if (!q) {
          res.status(400).json({ message: 'Missing search query (q)' });
          return;
        }
        const fields = (req.query.fields || '').trim() || undefined;
        const limit = parseOptionalIntQuery(req.query.limit, { min: 1, max: 100 });
        const page = parseOptionalIntQuery(req.query.page, { min: 1, max: 1000 });
        const pagination = limit != null || page != null;
        const preferRecommended = parseBoolQuery(req.query.preferRecommended, false);

        await this.traktClient.importToken(req.user.access_token);
        let results = await this.traktClient.searchText(q, type, {
          fields,
          limit,
          page,
          pagination,
        });

        const isPaginatedSearch = results
          && typeof results === 'object'
          && !Array.isArray(results)
          && Array.isArray(results.data);
        if (isPaginatedSearch) {
          results = results.data;
        }

        let meta = { recommendationBoost: false, boostedCount: 0 };
        if (preferRecommended) {
          const types = type.split(',').map((s) => s.trim()).filter(Boolean);
          const wantMovie = types.some((t) => t === 'movie');
          const wantShow = types.some((t) => t === 'show');
          const recIdSet = new Set();
          if (wantMovie || wantShow) {
            const fetches = [];
            if (wantMovie) {
              fetches.push(
                this.traktClient.getRecommendationsMovies({ limit: MAX_RECOMMENDATION_FETCH }),
              );
            }
            if (wantShow) {
              fetches.push(
                this.traktClient.getRecommendationsShows({ limit: MAX_RECOMMENDATION_FETCH }),
              );
            }
            const recLists = await Promise.all(fetches);
            let i = 0;
            if (wantMovie) {
              traktIdsFromRecommendationItems(recLists[i]).forEach((id) => recIdSet.add(id));
              i += 1;
            }
            if (wantShow) {
              traktIdsFromRecommendationItems(recLists[i]).forEach((id) => recIdSet.add(id));
            }
          }
          const safeResults = Array.isArray(results) ? results : [];
          const sorted = sortSearchResultsByRecommendationIds(safeResults, recIdSet, {
            preferRequested: true,
          });
          results = sorted.results;
          meta = sorted.meta;
        }

        res.json({ results, meta });
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post(
      '/trakt/lists/:trakt_list_user_id/:trakt_list_id/items',
      this.authProvider.requireLogin,
      async (req, res) => {
        try {
          const { type, traktId } = req.body || {};
          if (!type || traktId === undefined || traktId === null) {
            res.status(400).json({ message: 'body requires type and traktId' });
            return;
          }
          if (type !== 'show' && type !== 'movie') {
            res.status(400).json({ message: 'type must be show or movie' });
            return;
          }
          const traktListId = req.params.trakt_list_id;
          const traktListUserId = req.params.trakt_list_user_id;
          await this.traktClient.importToken(req.user.access_token);
          const body = type === 'show'
            ? { shows: [{ ids: { trakt: Number(traktId) } }] }
            : { movies: [{ ids: { trakt: Number(traktId) } }] };
          await this.traktClient.addListItems(traktListUserId, traktListId, body);

          const existingWatchables = await req.models.Watchable.findAll(
            { where: { trakt_list_id: traktListId } },
          );
          await this.refresh(req, traktListUserId, traktListId, existingWatchables);
          const watchables = await req.models.Watchable.findAll(
            { where: { trakt_list_id: traktListId } },
          );
          res.json({ ok: true, watchables });
        } catch (e) {
          this.handleError(res, e);
        }
      },
    );

    apiRouter.get('/watchlist/:trakt_list_user_id/:trakt_list_id/', this.authProvider.requireLogin, async (req, res) => {
      try {
        const traktListId = req.params.trakt_list_id;
        const traktListUserId = req.params.trakt_list_user_id;
        const sort = req.query.sort || 'least_watched';
        const order = watchlistSortOrder(sort);
        const showHidden = req.query.hidden === 'true';
        const filters = parseListFilters(req.query);
        const where = buildWatchlistWhere({
          traktListId,
          showHidden,
          ...filters,
        });

        const findAllOptions = {
          where,
          order,
          include: [recommendersInclude(req.models)],
        };
        let existingWatchables = await req.models.Watchable.findAll(findAllOptions);
        const { awaited } = await this.maybeRefreshIfStale(
          req,
          traktListUserId,
          traktListId,
        );
        if (awaited) {
          existingWatchables = await req.models.Watchable.findAll(findAllOptions);
        }
        res.json(existingWatchables.map(watchableToBrowseJson));
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post('/play/:service_type/:id/', this.authProvider.requireLogin, async (req, res) => {
      try {
        const result = await this.playWatchable(req, req.params.service_type, await req.models.Watchable.findByPk(req.params.id));
        res.json(result);
      } catch (e) {
        this.handleError(res, e);
      }
    });
    apiRouter.get('/settings', this.authProvider.requireLogin, async (req, res) => {
      const settings = await req.models.Settings.findOne();
      res.json(settings);
    });

    apiRouter.post('/settings', this.authProvider.requireLogin, async (req, res) => {
      const newSettings = req.body;
      let settings = await req.models.Settings.findOne();
      if (!settings) {
        settings = req.models.Settings.build({
          googletv_host: newSettings.googletv_host,
          googletv_port: newSettings.googletv_port,
        });
      } else {
        settings.googletv_host = newSettings.googletv_host;
        settings.googletv_port = newSettings.googletv_port;
      }
      const saved = await settings.save();
      await this.receiverFactory.update(saved);
      res.json(saved);
    });

    apiRouter.get('/moods', this.authProvider.requireLogin, async (req, res) => {
      try {
        res.json(await getMoodsPayload(req.models));
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.put('/moods', this.authProvider.requireLogin, async (req, res) => {
      try {
        res.json(await replaceMoodsAndMappings(req.models, req.body));
      } catch (e) {
        if (e.status) {
          res.status(e.status).json({ message: e.message });
          return;
        }
        this.handleError(res, e);
      }
    });

    apiRouter.get('/genres', this.authProvider.requireLogin, async (req, res) => {
      try {
        res.json(await getGenresPayload(req.models));
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post('/genres', this.authProvider.requireLogin, async (req, res) => {
      try {
        const label = req.body?.label ?? req.body?.slug;
        res.json(await ensureGenre(req.models, label));
      } catch (e) {
        if (e.status) {
          res.status(e.status).json({ message: e.message });
          return;
        }
        this.handleError(res, e);
      }
    });

    apiRouter.post('/reconnect', this.authProvider.requireLogin, async (req, res) => {
      const settings = await req.models.Settings.findOne();
      if (!settings) {
        res.status(500).json({ error: 'player has not been configured' });
        return;
      }
      await this.receiverFactory.update(settings);
      res.json({});
    });

    apiRouter.put('/watchables/', this.authProvider.requireLogin, async (req, res) => {
      try {
        const watchablesCreate = { ...req.body };
        const { personIds } = watchablesCreate;
        delete watchablesCreate.personIds;
        const watchable = req.models.Watchable.build(watchablesCreate);
        await watchable.save();
        if (personIds !== undefined) {
          await setWatchablePeople(req.models, watchable.id, personIds, req.user.id);
        }
        const withPeople = await req.models.Watchable.findOne({
          where: { id: watchable.id },
          include: [recommendersInclude(req.models)],
        });
        res.json(watchableToBrowseJson(withPeople));
      } catch (e) {
        if (e.status) {
          res.status(e.status).json({ message: e.message });
          return;
        }
        this.handleError(res, e);
      }
    });

    apiRouter.get('/watchables/:id', this.authProvider.requireLogin, async (req, res) => {
      try {
        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.id },
          include: [recommendersInclude(req.models)],
        });
        if (!watchable) {
          res.status(404).json({ message: 'not found' });
          return;
        }
        const providers = [];
        res.json({ watchable: watchableToBrowseJson(watchable), providers });
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.delete('/watchables/:id', this.authProvider.requireLogin, async (req, res) => {
      try {
        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.id },
        });
        if (!watchable) {
          res.status(404).json({ message: 'not found' });
          return;
        }
        if (watchable.local) {
          await watchable.destroy();
          res.status(204).send();
          return;
        }
        if (!watchable.trakt_list_id || !watchable.trakt_id
            || (watchable.media_type !== 'movie' && watchable.media_type !== 'show')) {
          res.status(400).json({
            message: 'cannot delete this synced item (missing Trakt list data); refresh the watchlist or remove it on Trakt',
          });
          return;
        }
        const slug = watchable.trakt_list_user_slug != null
          ? String(watchable.trakt_list_user_slug).trim()
          : '';
        const listOwner = slug || (req.user.username != null ? String(req.user.username).trim() : '');
        if (!listOwner) {
          res.status(400).json({
            message: 'cannot determine Trakt list owner; refresh the watchlist once or log in again',
          });
          return;
        }
        await this.traktClient.importToken(req.user.access_token);
        const body = watchable.media_type === 'show'
          ? { shows: [{ ids: { trakt: Number(watchable.trakt_id) } }] }
          : { movies: [{ ids: { trakt: Number(watchable.trakt_id) } }] };
        await this.traktClient.removeListItems(listOwner, watchable.trakt_list_id, body);
        await watchable.destroy();
        res.status(204).send();
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post('/watchables/:id', this.authProvider.requireLogin, async (req, res) => {
      try {
        const watchableUpdate = req.body;
        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.id },
        });
        if (!watchable) {
          res.status(404).json({ error: 'not found' });
          return;
        }
        watchable.hidden = watchableUpdate.hidden;
        watchable.comment = watchableUpdate.comment;
        watchable.web_url = watchableUpdate.webUrl;
        watchable.streaming_service_id = ProviderFactory.resolveStreamingServiceIdFromUrl(
          watchable.web_url,
        );
        if (Object.prototype.hasOwnProperty.call(watchableUpdate, 'streamingAddonId')) {
          watchable.streaming_addon_id = watchableUpdate.streamingAddonId;
        }
        watchable.noautoadvance = watchableUpdate.noautoadvance;
        if (Object.prototype.hasOwnProperty.call(watchableUpdate, 'rogerebertUrl')) {
          watchable.rogerebert_url = watchableUpdate.rogerebertUrl || null;
        }
        if (Object.prototype.hasOwnProperty.call(watchableUpdate, 'genres')) {
          await applyWatchableGenres(req.models, watchable, watchableUpdate.genres);
        }

        await watchable.save();
        if (Object.prototype.hasOwnProperty.call(watchableUpdate, 'personIds')) {
          await setWatchablePeople(
            req.models,
            watchable.id,
            watchableUpdate.personIds,
            req.user.id,
          );
        }
        if (
          Object.prototype.hasOwnProperty.call(watchableUpdate, 'webUrl')
          && (watchable.imdb_id || watchable.tmdb_id)
          && isStreamingSnapshotStale(watchable.streaming_checked_at)
        ) {
          try {
            await refreshWatchableStreamingSnapshot(req.models, req.user.id, watchable);
          } catch (snapErr) {
            debug(`streaming snapshot after save failed watchable ${watchable.id}: ${snapErr.message}`);
          }
        }
        const withPeople = await req.models.Watchable.findOne({
          where: { id: watchable.id },
          include: [recommendersInclude(req.models)],
        });
        res.json(watchableToBrowseJson(withPeople));
      } catch (e) {
        if (e.status) {
          res.status(e.status).json({ message: e.message });
          return;
        }
        this.handleError(res, e);
      }
    });

    apiRouter.get('/watchables/:id/episodes', this.authProvider.requireLogin, async (req, res) => {
      try {
        const episodes = await req.models.Episode.findAll({
          where: { watchable_id: req.params.id },
          order: ['season', 'episode'],
        });
        // TODO: create an array of seasons and then an array of episodes
        res.json(episodes);
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post('/watchables/:id/episodes/:episodeId', this.authProvider.requireLogin, async (req, res) => {
      try {
        const episode = await req.models.Episode.findOne({
          where: { watchable_id: req.params.id, id: req.params.episodeId },
        });
        const tasks = [];
        episode.watched = req.body.watched;
        tasks.push(episode.save());
        if (episode.watched) {
          tasks.push((async () => {
            await this.traktClient.importToken(req.user.access_token);
            await this.traktClient.setWatched(req.user.trakt_id, 'episode', episode.trakt_id);
          })());
        }
        await Promise.all(tasks);
        res.json(episode);
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.get('/streaming/catalog', this.authProvider.requireLogin, (req, res) => {
      try {
        const manifest = loadStreamingManifest();
        const { RECEIVER_KEYS } = require('../receiver/receiver_keys');
        res.json({
          country: manifest.country,
          services: manifest.services || [],
          receiverToServiceId: manifest.receiverToServiceId || {},
          receiverKeys: RECEIVER_KEYS,
        });
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.get('/streaming/access', this.authProvider.requireLogin, async (req, res) => {
      try {
        const row = await getOrCreateUserStreamingAccess(req.models, req.user.id);
        res.json(parseAccessResponse(row));
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.put('/streaming/access', this.authProvider.requireLogin, async (req, res) => {
      try {
        const row = await getOrCreateUserStreamingAccess(req.models, req.user.id);
        const serialized = serializePutBody(req.body || {});
        row.country = serialized.country;
        row.directServiceIds = serialized.directServiceIds;
        row.addonsByHost = serialized.addonsByHost;
        row.receiversEnabled = serialized.receiversEnabled;
        await row.save();
        res.json(parseAccessResponse(row));
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post('/remote/:service_type/:button', this.authProvider.requireLogin, async (req, res) => {
      const { button } = req.params;
      const serviceType = req.params.service_type;

      const provider = this.receiverFactory.getReceiver(serviceType);
      await provider.pushButton(button);
      res.status(200).json('ok');
    });

    // People img must register before /img/:watchable_id
    mountPeopleRoutes(apiRouter, { authProvider: this.authProvider });

    apiRouter.get('/img/trakt/:media_type/:trakt_id', this.authProvider.requireLogin, async (req, res) => {
      const traktPath = traktPosterDiskPath(req.params.media_type, req.params.trakt_id);
      try {
        if (!traktPath) {
          await pipeline(fs.createReadStream(defaultPosterImagePath), res);
          return;
        }
        if (fs.existsSync(traktPath) && !localPosterIsDefaultPlaceholder(traktPath)) {
          await pipeline(fs.createReadStream(traktPath), res);
          return;
        }

        await this.traktClient.importToken(req.user.access_token);

        const idNum = Number(parseTraktIdParam(req.params.trakt_id));
        const type = normalizeTraktPosterMediaType(req.params.media_type);

        const minimal = {
          type,
          [type]: { ids: { trakt: idNum } },
        };

        let posterUrl = await posterHelper.posterUrlForCandidate(this.traktClient, minimal);
        if (!posterUrl) {
          const sresInner = await this.traktClient.searchByTraktId(type, idNum);
          if (sresInner.length > 0) {
            const { ids } = sresInner[0][type];
            ids.type = type;
            const images = await this.traktClient.getImages(ids);
            posterUrl = posterHelper.normalizePosterValue(images?.poster);
          }
        }

        if (posterUrl) {
          const response = await axios({
            method: 'get',
            url: posterUrl,
            responseType: 'stream',
          });
          const traktDir = path.dirname(traktPath);
          if (!fs.existsSync(traktDir)) {
            fs.mkdirSync(traktDir, { recursive: true });
          }
          await pipeline(response.data, fs.createWriteStream(traktPath));
          await pipeline(fs.createReadStream(traktPath), res);
          return;
        }

        await pipeline(fs.createReadStream(defaultPosterImagePath), res);
      } catch (e) {
        Sentry.captureException(e);
        try {
          if (!res.headersSent) {
            await pipeline(fs.createReadStream(defaultPosterImagePath), res);
          }
        } catch (e2) {
          debug(e2);
          if (!res.headersSent) {
            res.status(500).end();
          }
        }
      }
    });

    apiRouter.get('/img/:watchable_id', this.authProvider.requireLogin, async (req, res) => {
      await serveWatchablePoster(res, {
        models: req.models,
        watchableId: req.params.watchable_id,
        traktClient: this.traktClient,
        user: req.user,
      });
    });

    apiRouter.post('/img/:watchable_id', this.authProvider.requireLogin, async (req, res) => {
      try {
        const { imageUrl } = req.body;
        const imagePath = path.join(__dirname, '../data/img/local/');
        const fileName = `${req.params.watchable_id}.jpg`;
        const fullPath = path.join(imagePath, fileName);
        debug(`Downloading ${imageUrl} to ${fullPath}`);

        const writeFile = async (input) => {
          try {
            if (!fs.existsSync(imagePath)) {
              fs.mkdirSync(imagePath, { recursive: true });
            }
            const combined = PassThrough();
            combined.pipe(fs.createWriteStream(fullPath));
            // combined.pipe(res);
            await input.pipe(combined);
          } catch (e) {
            debug(e);
            Sentry.captureException(e);
          }
        };

        const response = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'stream',
        });
        await writeFile(response.data);
        res.json({});
      } catch (e) {
        debug(e);
        Sentry.captureException(e);
      }
    });

    mountVoteSessionRoutes(apiRouter, {
      authProvider: this.authProvider,
      receiverFactory: this.receiverFactory,
      traktClient: this.traktClient,
      playWatchable: (req, serviceType, watchable) => this.playWatchable(req, serviceType, watchable),
    });
    mountRogerEbertRoutes(apiRouter, { authProvider: this.authProvider });
    mountTrailerRoutes(apiRouter, {
      authProvider: this.authProvider,
      traktClient: this.traktClient,
    });

    return apiRouter;
  }
}

module.exports = Api;
