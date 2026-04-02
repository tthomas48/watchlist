const { getTraktId } = require('./helpers');
const debug = require('debug')('watchlist:api:poster');

/**
 * Best-effort poster URL from Trakt search/list item with extended: full.
 */
function posterFromExtendedItem(item) {
  const t = item?.type;
  const entity = t ? item[t] : null;
  const poster = entity?.images?.poster;
  const normalized = normalizePosterValue(poster);
  if (normalized) {
    debug(
      'embedded poster hit type=%s traktId=%s rawType=%s url=%s',
      t,
      entity?.ids?.trakt ?? 'unknown',
      Array.isArray(poster) ? 'array' : typeof poster,
      normalized,
    );
  } else if (poster != null) {
    debug(
      'embedded poster present but unusable type=%s traktId=%s rawType=%s raw=%o',
      t,
      entity?.ids?.trakt ?? 'unknown',
      Array.isArray(poster) ? 'array' : typeof poster,
      poster,
    );
  } else {
    debug('embedded poster missing type=%s traktId=%s', t, entity?.ids?.trakt ?? 'unknown');
  }
  return normalized;
}

function normalizePosterValue(poster) {
  if (!poster) {
    return null;
  }
  if (typeof poster === 'string') {
    const s = poster.trim();
    if (!s) {
      return null;
    }
    if (s.startsWith('//')) {
      const url = `https:${s}`;
      return /^https?:\/\//i.test(url) ? url : null;
    }
    // Trakt CDN paths without scheme (e.g. media.trakt.tv/images/.../file.jpg.webp)
    if (/\.trakt\.tv\//i.test(s) && !/^https?:\/\//i.test(s)) {
      const hostPath = s.replace(/\.webp$/i, '');
      return `https://${hostPath}`;
    }
    // Never return non-URL-ish strings; avoid <img src="[object Object]"> etc.
    return /^https?:\/\//i.test(s) ? s : null;
  }
  if (Array.isArray(poster) && poster.length) {
    const last = poster[poster.length - 1];
    return normalizePosterValue(last);
  }
  // trakt.tv-images often returns { full, medium, thumb }.
  if (typeof poster === 'object') {
    const preferred = [poster.full, poster.medium, poster.thumb, poster.small];
    for (let i = 0; i < preferred.length; i += 1) {
      if (typeof preferred[i] === 'string' && preferred[i]) {
        return normalizePosterValue(preferred[i]);
      }
    }
    const vals = Object.values(poster);
    for (let i = 0; i < vals.length; i += 1) {
      if (typeof vals[i] === 'string' && vals[i]) {
        return normalizePosterValue(vals[i]);
      }
    }
  }
  return null;
}

async function posterUrlForCandidate(traktClient, item) {
  const id = getTraktId(item);
  const type = item?.type;
  const title = item?.[type]?.title || null;
  debug('poster lookup start type=%s traktId=%s title=%j', type, id, title);

  const direct = posterFromExtendedItem(item);
  if (direct) {
    debug('poster lookup resolved from embedded image type=%s traktId=%s', type, id);
    return direct;
  }
  if (!id || !type) {
    debug('poster lookup skipped missing id/type type=%s traktId=%s', type, id);
    return null;
  }
  try {
    debug('poster lookup requesting trakt images type=%s traktId=%s', type, id);
    const items = await traktClient.traktClient.search.id({ id_type: 'trakt', id: Number(id), type: type });
    const item = items[0][type];
    const images = item.images;

    //const images = await traktClient.getImages({ trakt: Number(id), type });
    debug(
      'poster lookup trakt response type=%s traktId=%s hasPoster=%s posterRaw=%o',
      type,
      id,
      Boolean(images?.poster),
      images?.poster,
    );
    const out = normalizePosterValue(images?.poster) || null;
    if (out) {
      debug('poster lookup normalized success type=%s traktId=%s url=%s', type, id, out);
    } else {
      debug('poster lookup normalized empty type=%s traktId=%s', type, id);
    }
    return out;
  } catch (e) {
    debug(
      'poster lookup error type=%s traktId=%s name=%s message=%s',
      type,
      id,
      e?.name || 'Error',
      e?.message || e,
    );
    return null;
  }
}

module.exports = {
  posterFromExtendedItem,
  posterUrlForCandidate,
  normalizePosterValue,
};
