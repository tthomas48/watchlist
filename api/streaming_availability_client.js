const debug = require('debug')('watchlist:streaming');
const {
  Client,
  Configuration,
  GetShowSeriesGranularityEnum,
  ResponseError,
} = require('streaming-availability');

let warnedMissingKey = false;

function warnMissingKeyOnce() {
  if (warnedMissingKey) {
    return;
  }
  warnedMissingKey = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[watchlist:streaming] RAPIDAPI_KEY is not set; streaming availability lookups are disabled.',
  );
}

let memoClient = null;
let memoSig = '';

/** Lazily construct client (memoized per apiKey + basePath). */
function createClient() {
  const apiKey = (process.env.RAPIDAPI_KEY || '').trim();
  if (!apiKey) {
    return null;
  }
  const hostRaw = (process.env.RAPIDAPI_HOST || '').trim().replace(/\/$/, '');
  const basePath = hostRaw
    ? `https://${hostRaw.replace(/^https?:\/\//, '')}`
    : '';
  const sig = `${apiKey}\0${basePath}`;
  if (memoClient && memoSig === sig) {
    return memoClient;
  }
  const config = { apiKey };
  if (basePath) {
    config.basePath = basePath;
  }
  memoClient = new Client(new Configuration(config));
  memoSig = sig;
  return memoClient;
}

/** @type {Map<string, { at: number, value: object }>} */
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 50;

function cacheKey(pathId, country, seriesGranularity) {
  return `${pathId}|${country || 'all'}|${seriesGranularity}`;
}

function cacheGet(key) {
  const row = cache.get(key);
  if (!row) {
    return null;
  }
  if (Date.now() - row.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return row.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
  cache.set(key, { at: Date.now(), value });
}

function normalizeImdb(id) {
  if (id === undefined || id === null || id === '') {
    return null;
  }
  const s = String(id).trim();
  if (!s || s === 'null') {
    return null;
  }
  if (s.startsWith('tt')) {
    return s;
  }
  if (/^\d+$/.test(s)) {
    return `tt${s}`;
  }
  return s;
}

/**
 * Raw path id for GET /shows/{id} (not URL-encoded; client encodes as needed).
 * @see https://docs.movieofthenight.com/resource/shows#get-a-show
 */
function buildShowPathId({ imdbId, tmdbId, mediaType }) {
  const imdb = normalizeImdb(imdbId);
  if (imdb) {
    return imdb;
  }
  if (tmdbId === undefined || tmdbId === null || tmdbId === '') {
    return null;
  }
  const t = String(tmdbId).trim();
  if (!t) {
    return null;
  }
  const prefix = mediaType === 'movie' ? 'movie' : 'tv';
  return `${prefix}/${t}`;
}

/**
 * @param {object} show - Show from API client
 * @param {string} [country]
 */
function summarizeShow(show, country) {
  if (!show || typeof show !== 'object') {
    return null;
  }
  const { streamingOptions: rawOptions } = show;
  let streamingOptions = rawOptions;
  if (country && streamingOptions && typeof streamingOptions === 'object') {
    const slice = streamingOptions[country];
    streamingOptions = slice !== undefined ? { [country]: slice } : { [country]: [] };
  }
  return {
    itemType: show.itemType,
    showType: show.showType,
    id: show.id,
    title: show.title,
    overview: show.overview,
    releaseYear: show.releaseYear,
    firstAirYear: show.firstAirYear,
    imdbId: show.imdbId,
    tmdbId: show.tmdbId,
    streamingOptions,
  };
}

/**
 * @param {object} opts
 * @param {string} [opts.imdbId]
 * @param {string|number} [opts.tmdbId]
 * @param {'movie'|'show'} opts.mediaType
 * @param {string} [opts.country] ISO country (e.g. us)
 */
async function fetchShowStreaming(opts) {
  const apiKey = (process.env.RAPIDAPI_KEY || '').trim();
  if (!apiKey) {
    warnMissingKeyOnce();
    return { ok: false, reason: 'not_configured' };
  }

  const pathId = buildShowPathId(opts);
  if (!pathId) {
    return { ok: false, reason: 'missing_ids', message: 'imdb_id or tmdb_id required' };
  }

  const country = (opts.country || process.env.STREAMING_AVAILABILITY_COUNTRY || 'us').trim().toLowerCase();
  const seriesGranularity = GetShowSeriesGranularityEnum.Show;
  const ck = cacheKey(pathId, country, seriesGranularity);
  const hit = cacheGet(ck);
  if (hit) {
    return hit;
  }

  const client = createClient();
  if (!client) {
    warnMissingKeyOnce();
    return { ok: false, reason: 'not_configured' };
  }

  try {
    const show = await client.showsApi.getShow({
      id: pathId,
      country,
      seriesGranularity,
    });

    const out = {
      ok: true,
      country,
      source: 'movieofthenight',
      show: summarizeShow(show, country),
    };
    cacheSet(ck, out);
    return out;
  } catch (e) {
    const { response } = e;
    const status = response && response.status;
    if ((e instanceof ResponseError || e.name === 'ResponseError') && status === 404) {
      return { ok: false, reason: 'not_found' };
    }
    debug('fetchShowStreaming error', e.message);
    throw e;
  }
}

module.exports = {
  fetchShowStreaming,
  buildShowPathId,
  normalizeImdb,
  summarizeShow,
  warnMissingKeyOnce,
};
