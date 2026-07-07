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
  let sres;
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

    const writeRemoteToCacheAndRes = async (readStream) => {
      if (!fs.existsSync(localImageDir)) {
        fs.mkdirSync(localImageDir, { recursive: true });
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

    await traktClient.importToken(user.access_token);

    let posterUrl = watchable.image || null;
    if (!posterUrl && watchable.trakt_id && watchable.media_type) {
      const minimal = {
        type: watchable.media_type,
        [watchable.media_type]: { ids: { trakt: Number(watchable.trakt_id) } },
      };
      posterUrl = await posterUrlForCandidate(traktClient, minimal);
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
      sres = await traktClient.findWatchable(watchable);
      if (sres.length > 0) {
        for (let i = 0; i < sres.length; i += 1) {
          debug(sres[i]);
          const { ids } = sres[i][watchable.media_type];
          ids.type = watchable.media_type;

          // eslint-disable-next-line no-await-in-loop
          const images = await traktClient.getImages(ids);
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

    await streamDefaultPoster(res, watchableId);
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
}

module.exports = {
  serveWatchablePoster,
  localPosterIsDefaultPlaceholder,
  defaultPosterImagePath,
};
