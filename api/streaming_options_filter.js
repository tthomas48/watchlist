const debug = require('debug')('watchlist:streaming-filter');

function isRentalOption(type) {
  const t = String(type || '').trim().toLowerCase();
  return t === 'rent' || t === 'buy';
}

function safeJsonParse(raw, fallback) {
  if (raw == null || raw === '') {
    return fallback;
  }
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

/**
 * Normalize DB row / DTO into subscription filter structure.
 * @param {object|null} row Sequelize model or plain object
 */
function parseUserStreamingAccess(row) {
  if (!row) {
    return {
      country: '',
      directServiceIds: new Set(),
      addonsByHost: {},
      receiversEnabled: {},
    };
  }
  const country = String(row.country || '').trim().toLowerCase();
  const directArr = safeJsonParse(row.directServiceIds, []);
  const addonsObj = safeJsonParse(row.addonsByHost, {});
  const recvObj = safeJsonParse(row.receiversEnabled, {});
  return {
    country,
    directServiceIds: new Set(
      Array.isArray(directArr) ? directArr.map((s) => String(s)) : [],
    ),
    addonsByHost: addonsObj && typeof addonsObj === 'object' ? addonsObj : {},
    receiversEnabled: recvObj && typeof recvObj === 'object' ? recvObj : {},
  };
}

function optionAllowedSubscription(access, opt) {
  const serviceId = opt?.service?.id;
  if (!serviceId) {
    return false;
  }
  const sid = String(serviceId);
  const addon = opt?.addon;

  if (addon && addon.id) {
    const hostId = String(addon.id);
    const allowed = access.addonsByHost[hostId];
    return Array.isArray(allowed) && allowed.includes(sid);
  }

  return access.directServiceIds.has(sid);
}

function subscriptionProfileNonEmpty(access) {
  if (access.directServiceIds.size > 0) {
    return true;
  }
  const hosts = Object.keys(access.addonsByHost);
  for (let i = 0; i < hosts.length; i += 1) {
    const arr = access.addonsByHost[hosts[i]];
    if (Array.isArray(arr) && arr.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Apply streaming-option filter (Rent vs Subscription).
 * @param {object} result fetchShowStreaming-style result
 * @param {object} opts
 * @param {'rent'|'subscription'} opts.mode
 * @param {ReturnType<typeof parseUserStreamingAccess>} opts.access
 * @param {boolean} opts.includeRentals
 */
function filterStreamingOptionsByMode(result, opts) {
  const { mode, access, includeRentals } = opts;
  if (!result?.ok || !result.show?.streamingOptions) {
    return {
      ...result,
      matchedProviders: [],
      streamingFilterMode: mode,
      subscriptionProfileEmpty: mode === 'subscription'
        ? !subscriptionProfileNonEmpty(access)
        : false,
    };
  }

  const outByCountry = {};
  const matchedProviders = [];

  if (mode === 'subscription' && !subscriptionProfileNonEmpty(access)) {
    return {
      ...result,
      show: {
        ...result.show,
        streamingOptions: {},
      },
      matchedProviders: [],
      filters: {
        includeRentals,
        mode: 'subscription',
        subscriptionProfileEmpty: true,
      },
      streamingFilterMode: 'subscription',
      subscriptionProfileEmpty: true,
    };
  }

  Object.entries(result.show.streamingOptions).forEach(([country, arr]) => {
    if (!Array.isArray(arr)) {
      outByCountry[country] = [];
      return;
    }
    const filtered = arr.filter((opt) => {
      if (!includeRentals && isRentalOption(opt?.type)) {
        return false;
      }
      if (mode === 'rent') {
        return true;
      }
      return optionAllowedSubscription(access, opt);
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
      mode,
      subscriptionProfileEmpty: mode === 'subscription'
        ? !subscriptionProfileNonEmpty(access)
        : false,
    },
    streamingFilterMode: mode,
    subscriptionProfileEmpty: mode === 'subscription'
      ? !subscriptionProfileNonEmpty(access)
      : false,
  };
}

function logCountryMismatch(accessCountry, envCountry) {
  const a = String(accessCountry || '').trim().toLowerCase();
  const e = String(envCountry || '').trim().toLowerCase();
  /* eslint-disable-next-line max-len */
  if (a && e && a !== e) {
    debug(
      '[watchlist] streaming country mismatch: UserStreamingAccess.country=%s STREAMING_AVAILABILITY_COUNTRY=%s',
      a,
      e,
    );
  }
}

module.exports = {
  parseUserStreamingAccess,
  filterStreamingOptionsByMode,
  subscriptionProfileNonEmpty,
  logCountryMismatch,
  isRentalOption,
};
