const debug = require('debug')('watchlist:api');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const express = require('express');
const axios = require('axios');
const singleflight = require('node-singleflight');
// const JustWatch = require('justwatch-api');
const Trakt = require('trakt.tv');
const TraktImages = require('trakt.tv-images');
const receiverFactory = require('../receiver/factory');

function getTitle(item) {
  const { type } = item;
  return item[type].title;
}

function getTraktId(item) {
  const { type } = item;
  return String(item[type].ids.trakt);
}

async function getTraktWatchlist(clientId, user, traktListUserId, traktListId) {
  try {
    const response = await axios.get(`https://api.trakt.tv/users/${traktListUserId}/lists/${traktListId}/items/`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId,
        Authorization: `Bearer ${user.access_token}`,
      },
    });
    return response.data;
  } catch (e) {
    // FIXME: Handle this error better
    debug(e);
    return [];
  }
}

async function refresh(clientId, req, traktListUserId, traktListId, existingWatchables) {
  await singleflight.Do(traktListId, async () => {
    try {
      debug('in refresh');
      const tasks = [];
      const traktItems = await getTraktWatchlist(clientId, req.user, traktListUserId, traktListId);
      debug(traktItems[0][traktItems[0]['type']].ids);

      // 2. find all that no longer exist in watchables
      const existingTraktIds = traktItems.map((traktItem) => getTraktId(traktItem));
      const existingWatchableTraktIds = existingWatchables.map((watchable) => watchable.trakt_id);
      const deletedItems = existingWatchables.filter(
        (watchable) => !existingTraktIds.includes(watchable.trakt_id),
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
      // 4. find all that exist in watchables
      // const justWatchTasks = [];
      // justWatchTasks.push(addJustWatchData(updateItems));
      // justWatchTasks.push(addJustWatchData(newItems));
      // await Promise.all(justWatchTasks);

      updateItems.forEach((traktItem) => {
        const existingWatchable = existingWatchables.find(
          (ew) => getTraktId(traktItem) === ew.trakt_id,
        );
        tasks.push(updateWatchable(req, traktItem, existingWatchable));
      });

      newItems.forEach((traktItem) => {
        tasks.push(createWatchable(req, traktListId, traktItem));
      });
      await Promise.all(tasks);
    } catch (e) {
      debug(e);
    }
  });
}

async function createWatchable(req, traktListId, watchable) {
  const props = {
    title: getTitle(watchable),
    trakt_id: getTraktId(watchable),
    trakt_list_id: traktListId,
    // justwatch_id: watchable.justwatch_id,
    image: watchable.image,
    media_type: watchable.type,
    imdb_id: watchable[watchable.type].ids?.imdb,
    tmdb_id: watchable[watchable.type].ids?.tmdb,
    urls: [],
  };
  // await updateFromWatchmodeCache(req, props);
  // TODO: lookup watchmode_id
  addUrls(req, props, watchable.provider_id, watchable.deeplink_web, 'web');
  return await req.models.Watchable.create(props, { include: [{ model: req.models.WatchableUrl, as: 'urls' }] });
}

async function updateWatchable(req, traktItem, watchable) {
  watchable.media_type = traktItem.type;
  watchable.imdb_id = traktItem[traktItem.type].ids?.imdb;
  watchable.tmdb_id = traktItem[traktItem.type].ids?.tmdb;
  // await updateFromWatchmodeCache(req, watchable);
  await watchable.save();
  // console.log(watchable);
  // TODO: lookup watchmode_id

  const props = {
    urls: [],
  };
  let isCustom = false;
  const foundUrl = [];
  const urls = await watchable.getUrls();
  urls.forEach((url) => {
    if (url.provider_id == -1) {
      isCustom = true;
      return;
    }
    // initialize all of our urls
    foundUrl[`${url.service_type}.${url.url}`] = url;
  });
  if (isCustom) {
    return Promise.resolve(watchable);
  }

  addUrls(req, props, traktItem.provider_id, traktItem.deeplink_web, 'web');

  const newUrls = props.urls;

  const toAdd = [];
  newUrls.forEach((url) => {
    if (!foundUrl[`${url.service_type}.${url.url}`]) {
      toAdd.push(url);
    }
  });

  const tasks = [];
  toAdd.forEach((watchableUrl) => {
    watchableUrl.watchable_id = watchable.id;
    tasks.push(req.models.WatchableUrl.create(watchableUrl));
  });

  foundUrl.forEach((found, key) => {
    tasks.push(watchable.removeUrl(found));
  });
  return await Promise.all(tasks);
}

const requireLogin = (req, res, next) => {
  if (req.user) {
    next();
    return;
  }
  res.status(401).send('Unauthorized');
  next('Unauthorized');
};

function addUrls(req, watchable, provider_id, urls, serviceType) {
  let i = 0;
  if (!urls) {
    return;
  }
  urls.forEach((link) => {
    if (!link) {
      return;
    }
    watchable.urls.push({
      url: link,
      service_type: serviceType,
      custom: false,
      provider_id,
    });
    i++;
  });
}

function api(clientId, passport, settingsPromise) {
  settingsPromise.then((settings) => {
    receiverFactory.init(settings);
  });

  const apiRouter = new express.Router();

  apiRouter.get('/login', (req, res) => {
    res.redirect('/api/auth/trakt');
    // res.redirect(`https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`);
  });

  apiRouter.get(
    '/auth/trakt',
    passport.authenticate('trakt'),
    (req, res) => {
      // The request will be redirected to Trakt for authentication, so this
      // function will not be called.
    },
  );

  apiRouter.get(
    '/auth/trakt/callback',
    passport.authenticate('trakt', { failureRedirect: '/api/login' }),
    (req, res) => {
      if (req.session.returnTo) {
        res.redirect(req.session.returnTo);
        return;
      }
      // go somewhere bogus
      res.redirect('/');
    },
  );

  apiRouter.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  // FIXME: should this be a POST since it does something?
  apiRouter.get('/refresh/:trakt_list_user_id/:trakt_list_id/', requireLogin, async (req, res, next) => {
    try {
      debug('refresh api');
      const traktListId = req.params.trakt_list_id;
      const traktListUserId = req.params.trakt_list_user_id;
      existingWatchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
      refresh(clientId, req, traktListUserId, traktListId, existingWatchables);

      existingWatchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
      res.json(existingWatchables);
    } catch (e) {
      debug(e);
      res.json(500, { error: e });
    }
  });

  apiRouter.get('/lists', requireLogin, async (req, res, next) => {
    const { user } = req;
    const response = await axios.get(`https://api.trakt.tv/users/${user.trakt_id}/lists/`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId,
        Authorization: `Bearer ${user.access_token}`,
      },
    });
    const response2 = await axios.get(`https://api.trakt.tv/users/${user.trakt_id}/lists/collaborations/`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId,
        Authorization: `Bearer ${user.access_token}`,
      },
    });
    const result = response.data.concat(response2.data);
    res.json(result);
  });

  apiRouter.get('/watchlist/:trakt_list_user_id/:trakt_list_id/', requireLogin, async (req, res) => {
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

      const findAllOptions = {
        where: { trakt_list_id: traktListId },
        order,
      };
      let existingWatchables = await req.models.Watchable.findAll(findAllOptions);
      // get the most recent updated_at from existingWatchables
      const mostRecentUpdate = existingWatchables.reduce((acc, watchable) => {
        if (watchable.updatedAt > acc) {
          return watchable.updatedAt;
        }
        return acc;
      }, new Date(0));
      // if the most recent_update is more than a day ago then we should call refresh
      if (mostRecentUpdate < new Date(Date.now() - 1000 * 60 * 60 * 24)) {
        debug(`Refreshing because ${mostRecentUpdate} is more than a day ago`);
        await refresh(clientId, req, traktListUserId, traktListId, existingWatchables);
      }
      existingWatchables = await req.models.Watchable.findAll(findAllOptions);
      res.json(existingWatchables);
    } catch (e) {
      debug(e);
      res.json(500, { error: e });
    }
  });

  apiRouter.post('/play/:service_type/:id/', requireLogin, async (req, res) => {
    try {
      const { id } = req.params;
      const serviceType = req.params.service_type;
      const watchableUrlType = 'web';

      const watchable = await req.models.Watchable.findByPk(id);
      watchable.last_played = new Date();
      const urls = await watchable.getUrls();

      const uris = urls.filter((url) => url.service_type === watchableUrlType);
      let watchableUrl = uris.find((url) => url.selected === true);
      if (!watchableUrl) {
        watchableUrl = uris[0];
      }
      const uri = watchableUrl.url;

      const provider = receiverFactory.getReceiver(serviceType);
      debug(`Playing ${uri} with ${serviceType}`);
      if (await provider.play(uri)) {
        await watchable.save();
        res.json({ uri });
        return;
      }
      throw new Error('unable to play');
    } catch (e) {
      debug(e);
      res.status(500).json(e);
    }
  });
  apiRouter.get('/settings', requireLogin, async (req, res) => {
    const settings = await req.models.Settings.findOne();
    res.json(settings);
  });

  apiRouter.post('/settings', requireLogin, async (req, res) => {
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
    await settings.save();
    await receiverFactory.update(settings);
    res.json(settings);
  });

  apiRouter.post('/reconnect', requireLogin, async (req, res) => {
    const settings = await req.models.Settings.findOne();
    if (!settings) {
      res.status(500).json({ error: 'player has not been configured' });
      return;
    }
    await receiverFactory.update(settings);
    res.json({});
  });

  apiRouter.get('/watchables/:id', requireLogin, async (req, res) => {
    try {
      const watchable = await req.models.Watchable.findOne({
        where: { id: req.params.id },
        include: [{ model: req.models.WatchableUrl, as: 'urls' }],
      });
      watchable.providers = [];
      // const providers = await sourceApi.getProviders(watchable);
      const providers = [];
      res.json({ watchable, providers });
    } catch (e) {
      debug(e);
      res.json(500, { error: e });
    }
  });

  apiRouter.post('/watchables/:id', requireLogin, async (req, res) => {
    const watchableUpdate = req.body;
    const watchable = await req.models.Watchable.findOne({
      where: { id: req.params.id },
      include: [{ model: req.models.WatchableUrl, as: 'urls' }],
    });
    const tasks = [];
    if (!watchable) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    watchable.hidden = watchableUpdate.hidden;
    watchable.comment = watchableUpdate.comment;

    let foundUrl = false;
    watchable.urls.forEach((url) => {
      if (url.service_type === 'web') {
        url.url = watchableUpdate.web_url || '';
        url.provider_id = -1;
        url.custom = true;
        tasks.push(url.save());
        foundUrl = true;
      }
    });
    if (!foundUrl) {
      tasks.push(req.models.WatchableUrl.create({
        watchable_id: watchable.id,
        url: watchableUpdate.web_url || '',
        service_type: 'web',
        custom: true,
        provider_id: -1,
      }));
    }

    await watchable.save();
    await Promise.all(tasks);
    res.json(watchable);
  });

  apiRouter.get('/providers', requireLogin, async (req, res) => {
    const providers = await req.models.Provider.findAll();
    res.json(providers);
  });

  apiRouter.post('/providers', requireLogin, async (req, res) => {
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

  apiRouter.put('/providers/:id', requireLogin, async (req, res) => {
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

  apiRouter.delete('/providers/:id', requireLogin, async (req, res) => {
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

  apiRouter.post('/remote/:service_type/:button', requireLogin, async (req, res) => {
    const { button } = req.params;
    const serviceType = req.params.service_type;

    const provider = receiverFactory.getReceiver(serviceType);
    await provider.pushButton(button);
    res.status(200).json('ok');
  });

  apiRouter.get('/img/:media_type/:trakt_id', requireLogin, async (req, res) => {
    let sres;
    try {
      const defaultImagePath = path.join(__dirname, '../images/movie.jpg');
      const imagePath = path.join(__dirname, `../data/img/${req.params.media_type}/`);
      const fileName = `${req.params.trakt_id}.jpg`;
      const fullPath = path.join(imagePath, fileName);
      if (fs.existsSync(fullPath)) {
        await fs.createReadStream(fullPath).pipe(res);
        return;
      }

      const writeFile = async (input) => {
        if (!fs.existsSync(imagePath)) {
          fs.mkdirSync(imagePath, { recursive: true });
        }
        combined = PassThrough();
        combined.pipe(fs.createWriteStream(fullPath));
        combined.pipe(res);
        await input.pipe(combined);
      };

      const trakt = new Trakt({
        client_id: clientId,
        plugins: {
          images: TraktImages,
        },
        options: {
          images: {
            tmdbApiKey: process.env.IMG_TMDB_APIKEY,
            tvdbApiKey: process.env.IMG_TVDB_APIKEY,
            fanartApiKey: process.env.IMG_FANART_APIKEY,
            smallerImages: true, // reduce image size, save bandwidth. defaults to false.
            cached: true, // requires trakt.tv-cached
          },
        },
      }, true);

      const { user } = req;
      await trakt.import_token(user.access_token);
      // hmm, so we need to store the type?
      sres = await trakt.search.id({ id_type: 'trakt', id: req.params.trakt_id, type: req.params.media_type });
      if (sres.length === 0) {
        // TODO: find a way to cache this with an empty image
        // res.json(404, { err: `could not find trakt item ${req.params.media_type} ${req.params.trakt_id}` });
        await writeFile(fs.createReadStream(defaultImagePath));
        return;
      }
      const { ids } = sres[0][req.params.media_type];
      ids.type = req.params.media_type;

      const images = await trakt.images.get(ids);
      if (!images.poster) {
        // TODO: find a way to cache this with an empty image
        // res.json(404, { err: `could not find poster ${req.params.media_type} ${req.params.trakt_id}` });
        await writeFile(fs.createReadStream(defaultImagePath));
        return;
      }
      const response = await axios({
        method: 'get',
        url: images.poster,
        responseType: 'stream',
      });
      await writeFile(response.data);
    } catch (e) {
      log(sres, e);
    }
  });

  return apiRouter;
}

module.exports = api;
