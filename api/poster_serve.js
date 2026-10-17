const debug = require('debug')('watchlist:poster');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const axios = require('axios');
const Sentry = require('@sentry/node');
const { posterUrlForCandidate, normalizePosterValue } = require('./poster_helper');
const { traktPosterDiskPath } = require('./poster_trakt_cache');

const defaultPosterImagePath = path.join(__dirname, '../images/movie.jpg');
const localImageDir = path.join(__dirname, '../data/img/local/');
let cachedDefaultPosterSha256 = null;

function sha256FileSync(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

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

function localPosterPath(watchableId) {
  return path.join(localImageDir, `${watchableId}.jpg`);
}

/**
 * Download a remote poster URL into local cache and mirror to trakt cache when possible.
 * @param {{ id: string|number, media_type?: string, trakt_id?: string|number }} watchable
 * @param {string} url
 * @returns {Promise<string>} Absolute path of the local JPEG
 */
async function downloadPosterToLocal(watchable, url) {
  const fullPath = localPosterPath(watchable.id);
  if (!fs.existsSync(localImageDir)) {
    fs.mkdirSync(localImageDir, { recursive: true });
  }
  const response = await axios({ method: 'get', url, responseType: 'stream' });
  await pipeline(response.data, fs.createWriteStream(fullPath));
  const traktPath = traktPosterDiskPath(watchable.media_type, watchable.trakt_id);
  if (traktPath) {
    const traktDir = path.dirname(traktPath);
    if (!fs.existsSync(traktDir)) {
      fs.mkdirSync(traktDir, { recursive: true });
    }
    await fs.promises.copyFile(fullPath, traktPath);
  }
  return fullPath;
}

async function streamDefaultPoster(res, watchableId) {
  const fullPath = localPosterPath(watchableId);
  if (!fs.existsSync(localImageDir)) {
    fs.mkdirSync(localImageDir, { recursive: true });
  }
  await pipeline(fs.createReadStream(defaultPosterImagePath), fs.createWriteStream(fullPath));
  await pipeline(fs.createReadStream(fullPath), res);
}

async function serveWatchablePoster(res, {
  models,
  watchableId,
  traktClient = null,
  user = null,
}) {
  const fullPath = localPosterPath(watchableId);
  try {
    if (fs.existsSync(fullPath) && !localPosterIsDefaultPlaceholder(fullPath)) {
      await pipeline(fs.createReadStream(fullPath), res);
      return;
    }

    const watchable = await models.Watchable.findOne({
      where: { id: watchableId },
    });
    debug(watchable);
    if (!watchable) {
      await pipeline(fs.createReadStream(defaultPosterImagePath), res);
      return;
    }

    const traktDisk = traktPosterDiskPath(watchable.media_type, watchable.trakt_id);
    if (traktDisk && fs.existsSync(traktDisk) && !localPosterIsDefaultPlaceholder(traktDisk)) {
      if (!fs.existsSync(localImageDir)) {
        fs.mkdirSync(localImageDir, { recursive: true });
      }
      await fs.promises.copyFile(traktDisk, fullPath);
      await pipeline(fs.createReadStream(fullPath), res);
      return;
    }

    if (!traktClient || !user?.access_token) {
      await streamDefaultPoster(res, watchableId);
      return;
    }

    await traktClient.importToken(user.access_token);

    let posterUrl = watchable.image ? normalizePosterValue(watchable.image) : null;
    if (!posterUrl && watchable.trakt_id && watchable.media_type) {
      const minimal = {
        type: watchable.media_type,
        [watchable.media_type]: { ids: { trakt: Number(watchable.trakt_id) } },
      };
      posterUrl = await posterUrlForCandidate(traktClient, minimal);
    }

    if (posterUrl) {
      await downloadPosterToLocal(watchable, posterUrl);
      await pipeline(fs.createReadStream(fullPath), res);
      return;
    }

    await streamDefaultPoster(res, watchableId);
  } catch (e) {
    Sentry.captureException(e);
    debug(e);
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
}

module.exports = {
  serveWatchablePoster,
  downloadPosterToLocal,
  localPosterIsDefaultPlaceholder,
  localPosterPath,
  defaultPosterImagePath,
};
