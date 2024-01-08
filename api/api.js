const debug = require('debug')('watchlist:api');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const axios = require('axios');
const singleflight = require('node-singleflight');
const Trakt = require('trakt.tv');
const TraktImages = require('trakt.tv-images');
const trakt = require('./trakt');
const { getTitle, getTraktId, getTraktIds } = require('./helpers');

class Api {
  constructor(authProvider, receiverFactory) {
    this.authProvider = authProvider;
    this.receiverFactory = receiverFactory;
  }

  handleError(res, err) {
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
      image: traktItem.image,
      media_type: traktItem.type,
      imdb_id: ids?.imdb,
      tmdb_id: ids?.tmdb,
    };
    return models.Watchable.create(props);
  }

  async updateWatchable(models, traktItem, watchable) {
    watchable.media_type = traktItem.type;
    watchable.imdb_id = traktItem[traktItem.type].ids?.imdb;
    watchable.tmdb_id = traktItem[traktItem.type].ids?.tmdb;
    return watchable.save();
  }

  async getLastRefresh(models) {
    let refreshStatusModel = await models.RefreshStatus.findOne({});
    if (!refreshStatusModel) {
      refreshStatusModel = models.RefreshStatus.build({ lastRefresh: new Date(1970, 1, 1) });
    }
    return refreshStatusModel;
  }

  async lastRefresh(models) {
    const refreshStatusModel = await this.getLastRefresh(models);
    return refreshStatusModel.lastRefresh;
  }

  async touchRefresh(models) {
    const refreshStatusModel = await this.getLastRefresh(models);
    refreshStatusModel.lastRefresh = new Date();
    return refreshStatusModel.save();
  }

  async refresh(req, traktListUserId, traktListId, existingWatchables) {
    const clientId = this.authProvider.getClientId();
    let error = null;
    await singleflight.Do(traktListId, async () => {
      try {
        debug('performing refresh');
        // do this first so we don't keep refreshing if there's an error
        await this.touchRefresh(req.models);
        const tasks = [];
        const traktItems = await trakt.getWatchlist(
          clientId,
          req.user,
          traktListUserId,
          traktListId,
        );

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
          tasks.push(this.updateWatchable(req.models, traktItem, existingWatchable));
        });

        newItems.forEach((traktItem) => {
          tasks.push(this.createWatchable(req.models, traktListId, traktItem));
        });
        await Promise.all(tasks);
      } catch (e) {
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
      const { user } = req;
      const response = await axios.get(`https://api.trakt.tv/users/${user.trakt_id}/lists/`, {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': this.authProvider.getClientId(),
          Authorization: `Bearer ${user.access_token}`,
        },
      });
      const response2 = await axios.get(`https://api.trakt.tv/users/${user.trakt_id}/lists/collaborations/`, {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': this.authProvider.getClientId(),
          Authorization: `Bearer ${user.access_token}`,
        },
      });
      const result = response.data.concat(response2.data);
      res.json(result);
    });

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

        const findAllOptions = {
          where: { trakt_list_id: traktListId },
          order,
        };
        const existingWatchables = await req.models.Watchable.findAll(findAllOptions);
        const mostRecentUpdate = await this.lastRefresh(req.models);
        // if the most recent_update is more than a day ago then we should call refresh
        if (mostRecentUpdate < new Date(Date.now() - 1000 * 60 * 60 * 24)) {
          debug(`Refreshing because ${mostRecentUpdate} is more than a day ago`);
          this.refresh(
            req,
            traktListUserId,
            traktListId,
            existingWatchables,
          );
        }
        res.json(existingWatchables);
      } catch (e) {
        this.handleError(res, e);
      }
    });

    apiRouter.post('/play/:service_type/:id/', this.authProvider.requireLogin, async (req, res) => {
      try {
        const { id } = req.params;
        const serviceType = req.params.service_type;
        const watchable = await req.models.Watchable.findByPk(id);
        watchable.last_played = new Date();

        const uri = watchable.web_url;
        if (!uri) {
          throw new Error(`no url specified for ${watchable.title}`);
        }
        const receiver = this.receiverFactory.getReceiver(serviceType);
        debug(`Playing ${uri} with ${serviceType}`);
        if (await receiver.play(uri)) {
          await watchable.save();
          res.json({ uri, message: `Playing ${watchable.title} with ${serviceType}` });
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

      await watchable.save();
      res.json(watchable);
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

    apiRouter.get('/img/:watchable_id', this.authProvider.requireLogin, async (req, res) => {
      let sres;
      try {
        const defaultImagePath = path.join(__dirname, '../images/movie.jpg');
        const imagePath = path.join(__dirname, '../data/img/local/');
        const fileName = `${req.params.watchable_id}.jpg`;
        const fullPath = path.join(imagePath, fileName);
        if (fs.existsSync(fullPath)) {
          await fs.createReadStream(fullPath).pipe(res);
          return;
        }
        // try to download the trakt image

        const writeFile = async (input) => {
          if (!fs.existsSync(imagePath)) {
            fs.mkdirSync(imagePath, { recursive: true });
          }
          const combined = PassThrough();
          combined.pipe(fs.createWriteStream(fullPath));
          combined.pipe(res);
          await input.pipe(combined);
        };

        const watchable = await req.models.Watchable.findOne({
          where: { id: req.params.watchable_id },
        });
        debug(watchable);
        if (watchable.trakt_id) {
          const traktClient = new Trakt({
            client_id: this.authProvider.getClientId(),
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
          await traktClient.import_token(user.access_token);
          // hmm, so we need to store the type?
          sres = await traktClient.search.id({ id_type: 'trakt', id: watchable.trakt_id, type: watchable.media_type });
          if (sres.length > 0) {
            for (let i = 0; i < sres.length; i += 1) {
              debug(sres[i]);
              const { ids } = sres[i][watchable.media_type];
              ids.type = watchable.media_type;

              const images = await traktClient.images.get(ids);
              debug(images);
              if (images.poster) {
                const response = await axios({
                  method: 'get',
                  url: images.poster,
                  responseType: 'stream',
                });
                await writeFile(response.data);
                return;
              }
            }
          }
        }

        // save the default image path
        await writeFile(fs.createReadStream(defaultImagePath));
      } catch (e) {
        debug(sres, e);
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
      }
    });

    return apiRouter;
  }
}

module.exports = Api;
