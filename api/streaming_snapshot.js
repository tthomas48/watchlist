const debug = require('debug')('watchlist:streaming-snapshot');
const { fetchShowStreaming } = require('./streaming_availability_client');
const {
  parseUserStreamingAccess,
  filterStreamingOptionsByMode,
  isRentalOption,
} = require('./streaming_options_filter');
const { getOrCreateUserStreamingAccess } = require('./streaming_access_service');

/** Subscription snapshot older than this is treated as stale. */
const STREAMING_SNAPSHOT_STALE_MS = 1000 * 60 * 60 * 24;

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
 * Compact subscription snapshot from a filtered MotN result.
 * @param {object} filtered - filterStreamingOptionsByMode output
 * @param {string} country
 */
function buildSubscriptionSnapshot(filtered, country) {
  const subscription = [];
  const seen = new Set();
  const providers = Array.isArray(filtered?.matchedProviders) ? filtered.matchedProviders : [];
  for (let i = 0; i < providers.length; i += 1) {
    const m = providers[i];
    if (isRentalOption(m?.type)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const key = `${m.serviceId || ''}|${m.addonId || ''}|${m.link || ''}|${m.type || ''}`;
    if (seen.has(key) || !m.link) {
      // eslint-disable-next-line no-continue
      continue;
    }
    seen.add(key);
    subscription.push({
      serviceId: m.serviceId || null,
      serviceName: m.serviceName || null,
      type: m.type || 'subscription',
      addonId: m.addonId || null,
      link: m.link,
    });
  }
  return {
    country: String(country || '').toLowerCase() || 'us',
    subscription,
  };
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
 * Additive watchlist field from DB columns.
 */
function streamingSummaryFromWatchable(watchable, now = Date.now()) {
  const checkedAt = watchable?.streaming_checked_at || null;
  const snapshot = parseStoredSnapshot(watchable?.streaming_options_json);
  const subscription = Array.isArray(snapshot?.subscription) ? snapshot.subscription : [];
  return {
    checkedAt: checkedAt ? new Date(checkedAt).toISOString() : null,
    stale: isStreamingSnapshotStale(checkedAt, now),
    subscription,
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

  const filtered = filterStreamingOptionsByMode(raw, {
    mode: 'subscription',
    access,
    includeRentals: false,
  });
  const snapshot = buildSubscriptionSnapshot(filtered, country);
  const checkedAt = new Date();
  watchable.streaming_options_json = JSON.stringify(snapshot);
  watchable.streaming_checked_at = checkedAt;
  await watchable.save();
  return { ok: true, snapshot, checkedAt };
}

module.exports = {
  STREAMING_SNAPSHOT_STALE_MS,
  isStreamingSnapshotStale,
  buildSubscriptionSnapshot,
  parseStoredSnapshot,
  streamingSummaryFromWatchable,
  extractRentalOptions,
  normalizePrice,
  refreshWatchableStreamingSnapshot,
};
