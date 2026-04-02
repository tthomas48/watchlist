const debug = require('debug')('watchlist:api');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const { pipeline } = require('stream/promises');
const axios = require('axios');
const singleflight = require('node-singleflight');
const { Op } = require('sequelize');
const Sentry = require('@sentry/node');
const TraktClient = require('./traktclient');
const { getTitle, getTraktId, getTraktIds } = require('./helpers');
const {
  MAX_RECOMMENDATION_FETCH,
  traktIdsFromRecommendationItems,
  sortSearchResultsByRecommendationIds,
} = require('./trakt_search_rank');
const { getCapabilities } = require('./capabilities');
const { fetchShowStreaming } = require('./streaming_availability_client');
const { posterUrlForCandidate, normalizePosterValue } = require('./poster_helper');
const {
  traktPosterDiskPath,
  normalizeTraktPosterMediaType,
  parseTraktIdParam,
} = require('./poster_trakt_cache');

const defaultPosterImagePath = path.join(__dirname, '../images/movie.jpg');
let cachedDefaultPosterSha256 = null;

function sha256FileSync(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/** True if localPath is byte-identical to the bundled default poster (cached JPEG). */
function localPosterIsDefaultPlaceholder(localPath) {
  if (!fs.existsSync(localPath) || !fs.existsSync(defaultPosterImagePath)) {
    return false;
  }
  const stLocal = fs.statSync(localPath);
  const stDef = fs.statSync(defaultPosterImagePath);
  if (stLocal.size !== stDef.size) {
    return false;
  }
  if (cachedDefaultPosterSha256 === null) {
    cachedDefaultPosterSha256 = sha256FileSync(defaultPosterImagePath);
  }
  return sha256FileSync(localPath) === cachedDefaultPosterSha256;
}

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

function normalizeHost(host) {
  if (!host) {
    return null;
  }
  return String(host).trim().toLowerCase().replace(/^www\./, '');
}

function hostFromMaybeUrl(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  try {
    return normalizeHost(new URL(raw).hostname);
  } catch {
    try {
      return normalizeHost(new URL(`https://${raw}`).hostname);
    } catch {
      return null;
    }
  }
}

function isRentalOption(type) {
  const t = String(type || '').trim().toLowerCase();
  return t === 'rent' || t === 'buy';
}

function optionMatchesProviders(option, providerHosts, providerNames) {
  if (!Array.isArray(providerHosts) || providerHosts.length === 0) {
    return false;
  }
  const hosts = [
    hostFromMaybeUrl(option?.link),
    hostFromMaybeUrl(option?.service?.homePage),
    hostFromMaybeUrl(option?.addon?.homePage),
  ].filter(Boolean);
  for (let i = 0; i < hosts.length; i += 1) {
    const h = hosts[i];
    if (providerHosts.some((ph) => h === ph || h.endsWith(`.${ph}`))) {
      return true;
    }
  }

  const serviceName = String(option?.service?.name || '').toLowerCase();
  const addonName = String(option?.addon?.name || '').toLowerCase();
  if (serviceName || addonName) {
    return providerNames.some((n) => (serviceName && serviceName.includes(n))
      || (addonName && addonName.includes(n)));
  }
  return false;
}

function filterStreamingOptionsForProviders(result, providers, opts = {}) {
  if (!result?.ok || !result.show?.streamingOptions) {
    return result;
  }
  const includeRentals = Boolean(opts.includeRentals);
  const providerHosts = (providers || [])
    .map((p) => hostFromMaybeUrl(p?.url))
    .filter(Boolean);
  const providerNames = (providers || [])
    .map((p) => String(p?.name || '').trim().toLowerCase())
    .filter(Boolean);

  const outByCountry = {};
  const matchedProviders = [];
  Object.entries(result.show.streamingOptions).forEach(([country, arr]) => {
    if (!Array.isArray(arr)) {
      outByCountry[country] = [];
      return;
    }
    const filtered = arr.filter((opt) => {
      if (!includeRentals && isRentalOption(opt?.type)) {
        return false;
      }
      if (providerHosts.length === 0 && providerNames.length === 0) {
        return true;
      }
      return optionMatchesProviders(opt, providerHosts, providerNames);
    });
    outByCountry[country] = filtered;
    for (let i = 0; i < filtered.length; i += 1) {
      const opt = filtered[i];
      matchedProviders.push({
        country,
        serviceId: opt?.service?.id || null,
        serviceName: opt?.service?.name || null,
        type: opt?.type || null,
        addonId: opt?.addon?.id || null,
        addonName: opt?.addon?.name || null,
        link: opt?.link || null,
      });
    }
  });

  const seen = new Set();
  const compactMatchedProviders = matchedProviders.filter((m) => {
    const key = `${m.link || ''}|${m.serviceId || ''}|${m.addonId || ''}|${m.type || ''}|${m.country || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return Boolean(m.link);
  });

  return {
    ...result,
    show: {
      ...result.show,
      streamingOptions: outByCountry,
    },
    matchedProviders: compactMatchedProviders,
    filters: {
      includeRentals,
      providerCount: (providers || []).length,
      providerFiltering: providerHosts.length > 0 || providerNames.length > 0,
    },
  };
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
    Sentry.captureException(err);
    const msg = JSON.stringify(err, Object.getOwnPropertyNames(err));
    debug(msg);
    res.status(500).send(msg);
  }

  async createWatchable(models, traktListId, traktItem) {
    const ids = getTraktIds(traktItem);
    const props = {
      title: getTitle(traktItem),
      trakt_id: getTraktId(traktItem),
      trakt_list_id: traktListId,
      media_type: traktItem.type,
      imdb_id: ids?.imdb,
      tmdb_id: ids?.tmdb,
      homepage: traktItem[traktItem.type]?.homepage,
      web_url: this.receiverFactory?.getStreamingUrl(traktItem[traktItem.type]?.homepage),
    };
    return models.Watchable.create(props);
  }

  async updateWatchable(traktItem, watchable) {
    watchable.media_type = traktItem.type;
    watchable.homepage = traktItem[traktItem.type].homepage;
    watchable.imdb_id = traktItem[traktItem.type].ids?.imdb;
    watchable.tmdb_id = traktItem[traktItem.type].ids?.tmdb;
    if (!watchable.web_url) {
      watchable.web_url = this.receiverFactory?.getStreamingUrl(watchable.homepage);
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

  /**
   * Writes poster JPEGs after list refresh: skips watchables that already have a non-placeholder
   * file; if the file is byte-identical to images/movie.jpg, tries again to fetch a real poster.
   */
  async prefetchMissingPosters(req, traktListId) {
    const token = req.user?.access_token;
    if (!token) {
      return;
    }
    const imageDir = path.join(__dirname, '../data/img/local/');
    let watchables;
    try {
      watchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
    } catch (e) {
      debug('prefetchMissingPosters findAll failed', e);
      return;
    }
    await this.traktClient.importToken(token);
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    for (let i = 0; i < watchables.length; i += 1) {
      const w = watchables[i];
      if (!w.trakt_id || !w.media_type) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const fullPath = path.join(imageDir, `${w.id}.jpg`);
      const haveRealPoster = fs.existsSync(fullPath) && !localPosterIsDefaultPlaceholder(fullPath);
      if (haveRealPoster) {
        // eslint-disable-next-line no-continue
        continue;
      }
      try {
        const minimal = {
          type: w.media_type,
          [w.media_type]: { ids: { trakt: Number(w.trakt_id) } },
        };
        // eslint-disable-next-line no-await-in-loop
        const url = await posterUrlForCandidate(this.traktClient, minimal);
        if (!url) {
          // eslint-disable-next-line no-continue
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const response = await axios({ method: 'get', url, responseType: 'stream' });
        // eslint-disable-next-line no-await-in-loop
        await pipeline(response.data, fs.createWriteStream(fullPath));
        const traktPath = traktPosterDiskPath(w.media_type, w.trakt_id);
        if (traktPath) {
          const traktDir = path.dirname(traktPath);
          if (!fs.existsSync(traktDir)) {
            fs.mkdirSync(traktDir, { recursive: true });
          }
          // eslint-disable-next-line no-await-in-loop
          await fs.promises.copyFile(fullPath, traktPath);
        }
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

        updateItems.forEach((traktItem) => {
          const existingWatchable = existingWatchables.find(
            (ew) => getTraktId(traktItem) === ew.trakt_id,
          );
          tasks.push(this.updateWatchable(traktItem, existingWatchable));
        });

        newItems.forEach((traktItem) => {
          tasks.push(this.createWatchable(req.models, traktListId, traktItem));
        });
        await Promise.all(tasks);
        await this.refreshEpisodes(req.models, traktListId);
        await this.prefetchMissingPosters(req, traktListId);
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
        this.refresh(
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
        const raw = await fetchShowStreaming({
          imdbId,
          tmdbId,
          mediaType: type,
          country,
        });
        const providers = await req.models.Provider.findAll();
        const filtered = filterStreamingOptionsForProviders(raw, providers, { includeRentals });
        res.json(filtered);
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
        const order = [];
        switch (sort) {
          case 'most-watched':
            order.push(['last_played', 'DESC']);
            break;
          case 'alpha-asc':
            order.push(['sortable_title', 'ASC']);
            break;
          case 'alpha-desc':
            order.push(['sortable_title', 'DESC']);
            break;
          case 'least-watched':
          default:
            order.push(['last_played', 'ASC']);
            break;
        }
        const showHidden = req.query.hidden === 'true';

        const where = { [Op.and]: [{ trakt_list_id: traktListId }] };
        if (!showHidden) {
          // by using ne true we get nulls as well
          where[Op.and].push({ [Op.or]: [{ hidden: false }, { hidden: null }] });
        }

        const findAllOptions = {
          where,
          order,
        };
        let existingWatchables = await req.models.Watchable.findAll(findAllOptions);
        const mostRecentUpdate = await this.lastRefresh(req.models, traktListId);
        debug(`Most recent update ${mostRecentUpdate}`);
        // if the most recent_update is more than a day ago then we should call refresh
        if (mostRecentUpdate < new Date(Date.now() - 1000 * 60 * 60 * 24)) {
          debug(`Refreshing because ${mostRecentUpdate} is more than a day ago`);
          const allWatchables = await req.models.Watchable.findAll(
            { where: { trakt_list_id: traktListId } },
          );
          await this.refresh(
            req,
            traktListUserId,
            traktListId,
            allWatchables,
          );
          existingWatchables = await req.models.Watchable.findAll(findAllOptions);
        }
        res.json(existingWatchables);
      } catch (e) {
        this.handleError(res, e);
      }
    });

    const markWatched = async function markWatched(traktClient, req, watchable) {
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
            await traktClient.setWatched(req.user.trakt_id, 'episode', nextUnwatchedId);
          }
        } else if (!watchable.local) {
          debug(`Auto-advancing ${watchable.title}`);
          await traktClient.setWatched(
            req.user.trakt_id,
            watchable.media_type,
            watchable.trakt_id,
          );
        }
      } catch (err) {
        // we log this, but don't want to actually stop playing if it doesn't work.
        Sentry.captureException(err);
      }
    };

    apiRouter.post('/play/:service_type/:id/', this.authProvider.requireLogin, async (req, res) => {
      try {
        const { id } = req.params;
        const serviceType = req.params.service_type;
        const watchable = await req.models.Watchable.findByPk(id);
        watchable.last_played = new Date();
        if (watchable.noautoadvance !== true) {
          await markWatched(this.traktClient, req, watchable);
        }

        const uri = watchable.web_url;
        if (!uri) {
          throw new Error(`no url specified for ${watchable.title}`);
        }
        const receiver = this.receiverFactory.getReceiver(serviceType);
        debug(`Playing ${uri} with ${serviceType}`);
        const playResponse = await receiver.play(uri);
        if (playResponse.result) {
          await watchable.save();
          // ok, so here, rather than just uri we want to be able to get all data from the receiver
          res.json({ uri, message: `Playing ${watchable.title} with ${serviceType}`, ...playResponse });
          return;
        }
        throw new Error('unable to play');
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
      const watchablesCreate = req.body;
      const watchable = req.models.Watchable.build(watchablesCreate);
      await watchable.save();
      res.json(watchable);
    });

    apiRouter.get('/watchables/:id', this.authProvider.requireLogin, async (req, res) => {
      try {
        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.id },
        });
        watchable.providers = [];
        // const providers = await sourceApi.getProviders(watchable);
        const providers = [];
        res.json({ watchable, providers });
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.delete('/watchables/:id', this.authProvider.requireLogin, async (req, res) => {
      const watchable = await req.models.Watchable.findOne({
        where: { id: req.params.id },
      });
      if (!watchable) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      if (!watchable.local) {
        res.status(400).json({ error: 'only local watchables can be deleted' });
        return;
      }
      await watchable.destroy();
      res.status(204).send();
    });

    apiRouter.post('/watchables/:id', this.authProvider.requireLogin, async (req, res) => {
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
      watchable.noautoadvance = watchableUpdate.noautoadvance;

      await watchable.save();
      res.json(watchable);
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

    apiRouter.get('/providers', this.authProvider.requireLogin, async (req, res) => {
      const providers = await req.models.Provider.findAll();
      res.json(providers);
    });

    apiRouter.post('/providers', this.authProvider.requireLogin, async (req, res) => {
      const providerCreate = req.body;
      debug(providerCreate);
      const provider = await req.models.Provider.create(
        {
          url: providerCreate.url,
          name: providerCreate.name,
        },
      );
      res.json(provider);
    });

    apiRouter.put('/providers/:id', this.authProvider.requireLogin, async (req, res) => {
      const providerUpdate = req.body;
      const provider = await req.models.Provider.findOne({
        where: { id: req.params.id },
      });
      if (!provider) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      provider.name = providerUpdate.name;
      provider.url = providerUpdate.url;
      await provider.save();
      res.json(provider);
    });

    apiRouter.delete('/providers/:id', this.authProvider.requireLogin, async (req, res) => {
      const provider = await req.models.Provider.findOne({
        where: { id: req.params.id },
      });
      if (!provider) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      await provider.destroy();
      res.json({});
    });

    apiRouter.post('/remote/:service_type/:button', this.authProvider.requireLogin, async (req, res) => {
      const { button } = req.params;
      const serviceType = req.params.service_type;

      const provider = this.receiverFactory.getReceiver(serviceType);
      await provider.pushButton(button);
      res.status(200).json('ok');
    });

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

        let posterUrl = await posterUrlForCandidate(this.traktClient, minimal);
        if (!posterUrl) {
          const sresInner = await this.traktClient.searchByTraktId(type, idNum);
          if (sresInner.length > 0) {
            const { ids } = sresInner[0][type];
            ids.type = type;
            const images = await this.traktClient.getImages(ids);
            posterUrl = normalizePosterValue(images?.poster);
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
      const imagePath = path.join(__dirname, '../data/img/local/');
      const fullPath = path.join(imagePath, `${req.params.watchable_id}.jpg`);
      let sres;
      try {
        if (fs.existsSync(fullPath) && !localPosterIsDefaultPlaceholder(fullPath)) {
          await pipeline(fs.createReadStream(fullPath), res);
          return;
        }

        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.watchable_id },
        });
        debug(watchable);
        if (!watchable) {
          await pipeline(fs.createReadStream(defaultPosterImagePath), res);
          return;
        }

        const traktDisk = traktPosterDiskPath(watchable.media_type, watchable.trakt_id);
        if (traktDisk && fs.existsSync(traktDisk) && !localPosterIsDefaultPlaceholder(traktDisk)) {
          if (!fs.existsSync(imagePath)) {
            fs.mkdirSync(imagePath, { recursive: true });
          }
          await fs.promises.copyFile(traktDisk, fullPath);
          await pipeline(fs.createReadStream(fullPath), res);
          return;
        }

        const writeRemoteToCacheAndRes = async (readStream) => {
          if (!fs.existsSync(imagePath)) {
            fs.mkdirSync(imagePath, { recursive: true });
          }
          await pipeline(readStream, fs.createWriteStream(fullPath));
          const tp = traktPosterDiskPath(watchable.media_type, watchable.trakt_id);
          if (tp) {
            const tdir = path.dirname(tp);
            if (!fs.existsSync(tdir)) {
              fs.mkdirSync(tdir, { recursive: true });
            }
            await fs.promises.copyFile(fullPath, tp);
          }
          await pipeline(fs.createReadStream(fullPath), res);
        };

        await this.traktClient.importToken(req.user.access_token);

        let posterUrl = watchable.image || null;
        if (!posterUrl && watchable.trakt_id && watchable.media_type) {
          const minimal = {
            type: watchable.media_type,
            [watchable.media_type]: { ids: { trakt: Number(watchable.trakt_id) } },
          };
          posterUrl = await posterUrlForCandidate(this.traktClient, minimal);
        }

        if (posterUrl) {
          const response = await axios({
            method: 'get',
            url: posterUrl,
            responseType: 'stream',
          });
          await writeRemoteToCacheAndRes(response.data);
          return;
        }

        if (watchable.trakt_id) {
          sres = await this.traktClient.findWatchable(watchable);
          if (sres.length > 0) {
            for (let i = 0; i < sres.length; i += 1) {
              debug(sres[i]);
              const { ids } = sres[i][watchable.media_type];
              ids.type = watchable.media_type;

              // eslint-disable-next-line no-await-in-loop
              const images = await this.traktClient.getImages(ids);
              debug(images);
              const fallbackPosterUrl = normalizePosterValue(images?.poster);
              if (fallbackPosterUrl) {
                // eslint-disable-next-line no-await-in-loop
                const response = await axios({
                  method: 'get',
                  url: fallbackPosterUrl,
                  responseType: 'stream',
                });
                // eslint-disable-next-line no-await-in-loop
                await writeRemoteToCacheAndRes(response.data);
                return;
              }
            }
          }
        }

        if (!fs.existsSync(imagePath)) {
          fs.mkdirSync(imagePath, { recursive: true });
        }
        await pipeline(fs.createReadStream(defaultPosterImagePath), fs.createWriteStream(fullPath));
        await pipeline(fs.createReadStream(fullPath), res);
      } catch (e) {
        Sentry.captureException(e);
        debug(sres, e);
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

    return apiRouter;
  }
}

module.exports = Api;
