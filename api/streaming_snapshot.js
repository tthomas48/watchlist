const debug = require('debug')('watchlist:streaming-snapshot');
const { fetchShowStreaming } = require('./streaming_availability_client');
const {
  parseUserStreamingAccess,
  filterStreamingOptionsByMode,
  isRentalOption,
} = require('./streaming_options_filter');
const { getOrCreateUserStreamingAccess } = require('./streaming_access_service');
const ProviderFactory = require('../receiver/providers/factory');

/** Subscription snapshot older than this is treated as stale. */
const STREAMING_SNAPSHOT_STALE_MS = 1000 * 60 * 60 * 24;

/** Existing play URLs may be rewritten when last_played is older than this (~3 months). */
const PLAY_URL_REFRESH_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 90;

function hasPlayUrl(watchable) {
  return watchable?.web_url != null && String(watchable.web_url).trim() !== '';
}

function hasExternalIds(watchable) {
  if (watchable?.imdb_id != null && String(watchable.imdb_id).trim() !== '') {
    return true;
  }
  return watchable?.tmdb_id != null && String(watchable.tmdb_id).trim() !== '';
}

/**
 * Whether MotN refresh may write web_url / service ids.
 * Missing URL: always. Existing: only if never played or last_played older than 3 months.
 */
function canRefreshPlayUrl(watchable, now = Date.now()) {
  if (!hasPlayUrl(watchable)) {
    return true;
  }
  const lp = watchable?.last_played;
  if (lp == null || lp === '') {
    return true;
  }
  const t = lp instanceof Date ? lp.getTime() : new Date(lp).getTime();
  if (!Number.isFinite(t)) {
    return true;
  }
  return now - t > PLAY_URL_REFRESH_MAX_AGE_MS;
}

function optionServiceIds(option) {
  const ids = new Set();
  if (option?.serviceId != null && String(option.serviceId).trim() !== '') {
    ids.add(String(option.serviceId));
  }
  const resolved = ProviderFactory.resolveStreamingServiceIdFromUrl(option?.link);
  if (resolved) {
    ids.add(String(resolved));
  }
  return ids;
}

function addonIdsEqual(a, b) {
  const left = a == null || a === '' ? null : String(a);
  const right = b == null || b === '' ? null : String(b);
  return left === right;
}

function optionDedupeKey(m) {
  return `${m.serviceId || ''}|${m.addonId || ''}|${m.link || ''}|${m.type || ''}`;
}

function compactNonRentalProviders(providers) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(providers) ? providers : [];
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (isRentalOption(m?.type) || !m?.link) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const key = optionDedupeKey(m);
    if (seen.has(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    seen.add(key);
    out.push({
      serviceId: m.serviceId || null,
      serviceName: m.serviceName || null,
      type: m.type || 'subscription',
      addonId: m.addonId || null,
      link: m.link,
    });
  }
  return out;
}

/**
 * Pick a subscription/free option for the play target.
 * Prefer matching streaming_service_id (+ addon when set); else first non-rental with a link.
 */
function pickPlayUrlOption(options, watchable) {
  const list = Array.isArray(options) ? options : [];
  const eligible = [];
  for (let i = 0; i < list.length; i += 1) {
    const opt = list[i];
    if (!opt?.link || isRentalOption(opt.type)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    eligible.push(opt);
  }
  if (!eligible.length) {
    return null;
  }

  const wantService = watchable?.streaming_service_id != null
    && String(watchable.streaming_service_id).trim() !== ''
    ? String(watchable.streaming_service_id)
    : null;
  if (!wantService) {
    return eligible[0];
  }

  const wantAddon = watchable?.streaming_addon_id;
  const withAddonMatch = eligible.find((opt) => (
    optionServiceIds(opt).has(wantService) && addonIdsEqual(opt.addonId, wantAddon)
  ));
  if (withAddonMatch) {
    return withAddonMatch;
  }

  const serviceOnly = eligible.find((opt) => optionServiceIds(opt).has(wantService));
  if (serviceOnly) {
    return serviceOnly;
  }

  return eligible[0];
}

/**
 * Write play target fields from a MotN/subscription option onto the watchable (in memory).
 * @returns {boolean} true if applied
 */
function applyPlayUrlOption(watchable, option) {
  if (!watchable || !option?.link) {
    return false;
  }
  watchable.web_url = option.link;
  watchable.streaming_service_id = ProviderFactory.resolveStreamingServiceIdFromUrl(option.link)
    || (option.serviceId != null ? String(option.serviceId) : null);
  watchable.streaming_addon_id = option.addonId != null && String(option.addonId).trim() !== ''
    ? String(option.addonId)
    : null;
  return true;
}

function isStreamingSnapshotStale(checkedAt, now = Date.now()) {
  if (checkedAt == null || checkedAt === '') {
    return true;
  }
  const t = checkedAt instanceof Date ? checkedAt.getTime() : new Date(checkedAt).getTime();
  if (!Number.isFinite(t)) {
    return true;
  }
  return now - t > STREAMING_SNAPSHOT_STALE_MS;
}

function parseStoredSnapshot(raw) {
  if (raw == null || raw === '') {
    return null;
  }
  if (typeof raw === 'object') {
    return raw;
  }
  try {
    return JSON.parse(String(raw));
  } catch (e) {
    debug('parseStoredSnapshot failed: %s', e.message);
    return null;
  }
}

/**
 * Fill/rewrite web_url from stored snapshot.subscription (no MotN).
 * @returns {{ ok: true, playUrlUpdated: boolean }}
 */
async function applyPlayUrlFromStoredSnapshot(watchable, { save = true } = {}) {
  if (!watchable || !canRefreshPlayUrl(watchable)) {
    return { ok: true, playUrlUpdated: false };
  }
  const snapshot = parseStoredSnapshot(watchable.streaming_options_json);
  const chosen = pickPlayUrlOption(snapshot?.subscription, watchable);
  if (!chosen) {
    return { ok: true, playUrlUpdated: false };
  }
  const playUrlUpdated = applyPlayUrlOption(watchable, chosen);
  if (playUrlUpdated && save) {
    await watchable.save();
  }
  return { ok: true, playUrlUpdated };
}

/**
 * Whether list sync should call MotN for this watchable.
 * Stale snapshots always; missing play URL when snapshot is absent, has fillable
 * subscription links, or lacks the newer `other` field (one-time schema upgrade).
 */
function needsMotNStreamingRefresh(watchable, now = Date.now()) {
  if (!hasExternalIds(watchable)) {
    return false;
  }
  if (isStreamingSnapshotStale(watchable?.streaming_checked_at, now)) {
    return true;
  }
  if (hasPlayUrl(watchable)) {
    return false;
  }
  const snap = parseStoredSnapshot(watchable?.streaming_options_json);
  if (!snap) {
    return true;
  }
  const sub = Array.isArray(snap.subscription) ? snap.subscription : [];
  if (sub.some((s) => s?.link)) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(snap, 'other')) {
    return true;
  }
  return false;
}

function normalizePrice(price) {
  if (!price || typeof price !== 'object') {
    return null;
  }
  const amount = price.amount != null ? String(price.amount) : null;
  const currency = price.currency != null ? String(price.currency) : null;
  const formatted = price.formatted != null ? String(price.formatted) : null;
  if (!amount && !formatted) {
    return null;
  }
  return { amount, currency, formatted };
}

/**
 * Compact snapshot: profile matches + other subscription/free options.
 * @param {object} filteredMine - filterStreamingOptionsByMode subscription mode
 * @param {string} country
 * @param {object} [filteredAll] - filterStreamingOptionsByMode all / non-rental
 */
function buildSubscriptionSnapshot(filteredMine, country, filteredAll = null) {
  const subscription = compactNonRentalProviders(filteredMine?.matchedProviders);
  const mineKeys = new Set(subscription.map(optionDedupeKey));
  let other = [];
  if (filteredAll) {
    other = compactNonRentalProviders(filteredAll.matchedProviders).filter(
      (o) => !mineKeys.has(optionDedupeKey(o)),
    );
  }
  return {
    country: String(country || '').toLowerCase() || 'us',
    subscription,
    other,
  };
}

/**
 * Additive watchlist field from DB columns.
 */
function streamingSummaryFromWatchable(watchable, now = Date.now()) {
  const checkedAt = watchable?.streaming_checked_at || null;
  const snapshot = parseStoredSnapshot(watchable?.streaming_options_json);
  const subscription = Array.isArray(snapshot?.subscription) ? snapshot.subscription : [];
  const other = Array.isArray(snapshot?.other) ? snapshot.other : [];
  return {
    checkedAt: checkedAt ? new Date(checkedAt).toISOString() : null,
    stale: isStreamingSnapshotStale(checkedAt, now),
    subscription,
    other,
  };
}

/**
 * Rent / buy options with prices from a MotN fetch (unfiltered for TVOD).
 */
function extractRentalOptions(rawResult) {
  const options = [];
  const seen = new Set();
  const byCountry = rawResult?.show?.streamingOptions || {};
  Object.entries(byCountry).forEach(([country, arr]) => {
    if (!Array.isArray(arr)) {
      return;
    }
    for (let i = 0; i < arr.length; i += 1) {
      const opt = arr[i];
      if (!isRentalOption(opt?.type) || !opt?.link) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const key = `${opt.link}|${opt.service?.id || ''}|${opt.type}|${country}`;
      if (seen.has(key)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      seen.add(key);
      options.push({
        serviceId: opt.service?.id || null,
        serviceName: opt.service?.name || null,
        type: opt.type,
        price: normalizePrice(opt.price),
        link: opt.link,
        country,
      });
    }
  });
  return options;
}

/**
 * Fetch MotN, filter to subscription profile, persist snapshot on watchable.
 */
async function refreshWatchableStreamingSnapshot(models, userId, watchable) {
  if (!watchable) {
    return { ok: false, reason: 'missing_watchable' };
  }
  const mediaType = watchable.media_type === 'show' ? 'show' : 'movie';
  const accessRow = await getOrCreateUserStreamingAccess(models, userId);
  const access = parseUserStreamingAccess(accessRow);
  const country = access.country
    || (process.env.STREAMING_AVAILABILITY_COUNTRY || 'us').trim().toLowerCase();

  const raw = await fetchShowStreaming({
    imdbId: watchable.imdb_id,
    tmdbId: watchable.tmdb_id,
    mediaType,
    country,
  });
  if (!raw.ok) {
    return raw;
  }

  const filteredMine = filterStreamingOptionsByMode(raw, {
    mode: 'subscription',
    access,
    includeRentals: false,
  });
  const filteredAll = filterStreamingOptionsByMode(raw, {
    mode: 'all',
    access,
    includeRentals: false,
  });
  const snapshot = buildSubscriptionSnapshot(filteredMine, country, filteredAll);
  const checkedAt = new Date();
  watchable.streaming_options_json = JSON.stringify(snapshot);
  watchable.streaming_checked_at = checkedAt;

  let playUrlUpdated = false;
  if (canRefreshPlayUrl(watchable)) {
    const chosen = pickPlayUrlOption(snapshot.subscription, watchable);
    if (chosen) {
      playUrlUpdated = applyPlayUrlOption(watchable, chosen);
    }
  }

  await watchable.save();
  return {
    ok: true,
    snapshot,
    checkedAt,
    playUrlUpdated,
  };
}

module.exports = {
  STREAMING_SNAPSHOT_STALE_MS,
  PLAY_URL_REFRESH_MAX_AGE_MS,
  isStreamingSnapshotStale,
  canRefreshPlayUrl,
  hasPlayUrl,
  hasExternalIds,
  needsMotNStreamingRefresh,
  pickPlayUrlOption,
  applyPlayUrlOption,
  applyPlayUrlFromStoredSnapshot,
  buildSubscriptionSnapshot,
  parseStoredSnapshot,
  streamingSummaryFromWatchable,
  extractRentalOptions,
  normalizePrice,
  refreshWatchableStreamingSnapshot,
};
