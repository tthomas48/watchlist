const express = require('express');
const axios = require('axios');
const singleflight = require('node-singleflight')
const JustWatch = require('justwatch-api');
const providerFactory = require('../provider/factory');


const justwatch = new JustWatch({ locale: 'en_US' });
const providerRaw = process.env['SUPPORTED_PROVIDERS']
const supportedProviders = providerRaw.split(',');

async function refresh(clientId, req, traktListId, existingWatchables) {
    await singleflight.Do(traktListId, async () => {

        console.log('in refresh');
        const tasks = [];
        const explicitRefresh = false;
        const traktItems = await getTraktWatchlist(clientId, req.user, traktListId);
                
        // 2. find all that no longer exist in watchables
        const existingTraktIds = traktItems.map((traktItem) => getTraktId(traktItem));
        const existingWatchableTraktIds = existingWatchables.map((watchable) => watchable.trakt_id);
        const deletedItems = existingWatchables.filter((watchable) => !existingTraktIds.includes(watchable.trakt_id));
        const updateItems = traktItems.filter((traktItem) => existingWatchableTraktIds.includes(getTraktId(traktItem)));
        const newItems = traktItems.filter((traktItem) => !existingWatchableTraktIds.includes(getTraktId(traktItem)));

        // 3. delete them
        deletedItems.forEach((deletedItem) => {
            tasks.push(deletedItem.destroy());
        });
        // 4. find all that exist in watchables
        const justWatchTasks = [];
        justWatchTasks.push(addJustWatchData(updateItems));
        justWatchTasks.push(addJustWatchData(newItems));
        await Promise.all(justWatchTasks);

        updateItems.forEach((traktItem) => {
            const existingWatchable = existingWatchables.find((ew) => getTraktId(traktItem) === ew.trakt_id);
            tasks.push(updateWatchable(req, traktItem, existingWatchable));
        });

        newItems.forEach((traktItem) => {
            tasks.push(createWatchable(req, traktListId, traktItem));
        });
        await Promise.all(tasks);
    });
}



async function getTraktWatchlist(clientId, user, traktListId) {
    try {
        const response = await axios.get(`https://api.trakt.tv/users/${user.trakt_id}/lists/${traktListId}/items/`, {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': clientId,
                'Authorization': `Bearer ${user.access_token}`,
            },
        });
        // console.log(response.data);
        return response.data;
    } catch (e) {
        // FIXME: Handle this error better
        console.error(e);
        return [];
    }
}

function getTitle(item) {
    var type = item.type;
    return item[type].title;
}

function getTraktId(item) {
    var type = item.type;
    return String(item[type].ids.trakt);
}

function getTmdbId(item) {
    var type = item.type;
    return String(item[type].ids.tmdb);
}

async function getJustWatchProviders(watchable) {
    const providers = await justwatch.getProviders();

    var title = watchable.title;
    const result = [];
    const results = await justwatch.search({ query: title, content_types: [watchable.media_type] });
    results.items.every((justwatchItem) => {
        if (justwatchItem.title === title) {
            justwatchItem.offers?.forEach((offer) => {
                if (supportedProviders.indexOf(String(offer.provider_id)) > -1) {
                    const providerObj = providers.find((provider) => provider.id === offer.provider_id);
                    if (!result.find((r) => r.id == offer.provider_id)) {
                        result.push(providerObj);
                    }                    
                }
            });
            return false;
        }
        return true;
    });
    return result;
}

async function getJustWatchUrls(watchable, providerId) {
    const empty = {
        urls: {
            standard_web: "",
        }
    };
    if (providerId == "undefined") {
        return empty;
    }
    
    var title = watchable.title;
    let item;
    const results = await justwatch.search({ query: title, content_types: [watchable.media_type] });
    for (let i = 0; i < results.items.length; i++) {
        const justwatchItem = results.items[i];
        if (justwatchItem.title === title) {
            item = justwatchItem.offers?.find((offer) => {
                return offer.provider_id == providerId;
            });
            break;
        }
    }
    return item || empty;
}


async function addJustWatchData(items) {
    // const providers = await justwatch.getProviders();
    // const appleproviders = providers.filter((provider) => provider.clear_name.startsWith('PBS'));
    // console.log(appleproviders);

    // so I think we should cache this information and then another lookup when you want to watch
    var tasks = [];
    for (let i = 0; i < items.length; i++) {
        var title = getTitle(items[i]);
        tasks[i] = justwatch.search({ query: title, content_types: [items[i].type] });
    }

    const results = await Promise.all(tasks);
    for (let i = 0; i < results.length; i++) {
        var title = getTitle(items[i]);
        var resultItems = results[i].items;
        resultItems.every((resultItem) => {
            var foundTitle = addJustWatchTitle(items[i], resultItem);
            // continue only if we didn't find a title
            return !foundTitle;
        });
    }
}

function addJustWatchTitle(traktItem, justwatchItem) {
    var title = getTitle(traktItem);
    var type = traktItem.type;
    if (justwatchItem.title === title) {
        traktItem.justwatch_id = justwatchItem.id;
        traktItem.deeplink_web = [];
        traktItem.image = justwatchItem.poster ? `https://images.justwatch.com${justwatchItem.poster.replace('{profile}', 's592')}` : '';
        const urlType = type === 'movie' ? 'movie' : 'tv-show';
        const titleNoApostraphe = title.replace(/[']/g, '');
        const titleCleaned = titleNoApostraphe.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        traktItem.url = `https://www.justwatch.com/us/${urlType}/${titleCleaned}`;

        // TODO: should we move this to belongsTo?
        justwatchItem.offers?.every((offer) => {
            if (supportedProviders.indexOf(String(offer.provider_id)) > -1) {
                traktItem.provider_id = offer.provider_id;
                traktItem.deeplink_web.push(offer.urls.standard_web);
                return false;
            }
            return true;
        });
        return true;
    }
    return false;
}

async function createWatchable(req, traktListId, watchable) {
    const props = {
        title: getTitle(watchable),
        trakt_id: getTraktId(watchable),
        trakt_list_id: traktListId,
        justwatch_id: watchable.justwatch_id,
        image: watchable.image,
        media_type: watchable.type,
        urls: [],
    };
    addUrls(req, props, watchable.provider_id, watchable.deeplink_web, 'web');
    return await req.models.Watchable.create(props, { include: [{ model: req.models.WatchableUrl, as: 'urls' }] });
}

async function updateWatchable(req, traktItem, watchable) {
    const props = {
        urls: [],
    };
    var isCustom = false;
    var foundUrl = [];
    var urls = await watchable.getUrls();
    urls.forEach((url) => {
        if (url.provider_id == -1) {
            isCustom = true;
            return;
        }
        // initialize all of our urls
        foundUrl[url.service_type + "." + url.url] = url;
    });
    if (isCustom) {
        return Promise.resolve(watchable);
    }

    addUrls(req, props, traktItem.provider_id, traktItem.deeplink_web, 'web');

    var newUrls = props.urls;


    var toAdd = [];
    newUrls.forEach((url) => {
        if (!foundUrl[url.service_type + "." + url.url]) {
            toAdd.push(url);
            return;
        }
    });

    var tasks = [];
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
    res.status(401).send("Unauthorized");
    next("Unauthorized");
}

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
            provider_id: provider_id,
        });
        i++;
    });
}


function api(clientId, passport, settingsPromise) {
    settingsPromise.then((settings) => {
        providerFactory.init(settings);
    });    

    const apiRouter = new express.Router();

    apiRouter.get('/login', function (req, res) {
        res.redirect('/api/auth/trakt');
        // res.redirect(`https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`);
    });

    apiRouter.get('/auth/trakt',
        passport.authenticate('trakt'),
        function (req, res) {
            // The request will be redirected to Trakt for authentication, so this
            // function will not be called.
        });

    apiRouter.get('/auth/trakt/callback',
        passport.authenticate('trakt', { failureRedirect: '/api/login' }),
        function (req, res) {
            if (req.session.returnTo) {
                res.redirect(req.session.returnTo);
                return;
            }
            // go somewhere bogus
            res.redirect('/');
        });

    apiRouter.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    // FIXME: should this be a POST since it does something?
    apiRouter.get('/refresh/:trakt_list_id/', requireLogin, async (req, res, next) => {
        console.log("refresh api");
        const traktListId = req.params['trakt_list_id'];
        existingWatchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
        refresh(clientId, req, traktListId, existingWatchables);

        existingWatchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
        res.json(existingWatchables);
    });

    apiRouter.get('/lists', requireLogin, async (req, res, next) => {
        const user = req.user;
        const response = await axios.get(`https://api.trakt.tv/users/${user.trakt_id}/lists/`, {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': clientId,
                'Authorization': `Bearer ${user.access_token}`,
            },
        });
        res.json(response.data);
    });

    apiRouter.get('/watchlist/:trakt_list_id/', requireLogin, async (req, res) => {

        const traktListId = req.params['trakt_list_id'];
        let existingWatchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
        // get the most recent updated_at from existingWatchables
        const mostRecentUpdate = existingWatchables.reduce((acc, watchable) => {
            if (watchable.updatedAt > acc) {
                return watchable.updatedAt;
            }
            return acc;
        }, new Date(0));
        // if the most recent_update is more than a day ago then we should call refresh
        if (mostRecentUpdate < new Date(Date.now() - 1000 * 60 * 60 * 24)) {
            console.log("Refreshing because " + mostRecentUpdate + " is more than a day ago");
            await refresh(clientId, req, traktListId, existingWatchables);
        }
        existingWatchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
        res.json(existingWatchables);
    });

    apiRouter.post('/play/:service_type/:id/', requireLogin, async (req, res) => {
        try {
            const id = req.params['id'];
            const serviceType = req.params['service_type'];
            let watchableUrlType = "web";

            const watchable = await req.models.Watchable.findByPk(id);
            const urls = await watchable.getUrls();

            const uris = urls.filter((url) => url.service_type === watchableUrlType);
            let watchableUrl = uris.find((url) => url.selected === true);
            if (!watchableUrl) {
                watchableUrl = uris[0];
            }
            const uri = watchableUrl.url;

            const provider = providerFactory.getProvider(serviceType);
            console.log(`Playing ${uri} with ${serviceType}`)
            if (await provider.play(uri)) {
                res.json({uri});
                return;
            }
            throw new Error("unable to play");
        } catch (e) {
            console.error(e);
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
        await providerFactory.update(settings);
        res.json(settings);
    });

    apiRouter.get('/watchables/:id', requireLogin, async (req, res) => {        
        const watchable = await req.models.Watchable.findOne({
            where: { id: req.params.id },
            include: [{ model: req.models.WatchableUrl, as: 'urls'}],
        });
        const providers = await getJustWatchProviders(watchable);
        watchable.providers = providers;
        res.json({watchable, providers});
    });

    apiRouter.get('/watchables/:id/urls/:provider_id', requireLogin, async (req, res) => {        
        const providerId = req.params.provider_id;
        const watchable = await req.models.Watchable.findOne({
            where: { id: req.params.id },
            include: [{ model: req.models.WatchableUrl, as: 'urls'}],
        });
        const offer = await getJustWatchUrls(watchable, providerId);
        res.json([
            { service_type: "web", url: offer.urls.standard_web},
        ]);
    });


    apiRouter.post('/watchables/:id', requireLogin, async (req, res) => {
        const watchableUpdate = req.body;       
        const watchable = await req.models.Watchable.findOne({
            where: { id: req.params.id }, 
            include: [{ model: req.models.WatchableUrl, as: 'urls'}],
        });
        var tasks = [];
        if (!watchable) {
            res.status(404).json({error: "not found"});
            return;
        } else {
            var foundUrl = false;
            watchable.urls.forEach((url) => {
                if (url.service_type === 'web') {
                    url.url = watchableUpdate.web_url || "";
                    url.provider_id = -1;
                    url.custom = true;
                    tasks.push(url.save());
                    foundUrl = true;
                }
            });
            if (!foundUrl) {
                tasks.push(req.models.WatchableUrl.create({
                    watchable_id: watchable.id,                    
                    url: watchableUpdate.web_url,
                    service_type: 'web',
                    custom: true,
                    provider_id: -1,
                }));
            }
        }
        await watchable.save();
        await Promise.all(tasks);
        res.json(watchable);
    });

    apiRouter.post('/remote/:service_type/:button', requireLogin, async (req, res) => {
        console.log('here');
        const button = req.params['button'];
        const serviceType = req.params['service_type'];

        const provider = providerFactory.getProvider(serviceType);
        console.log(provider);
        console.log(serviceType);
        await provider.pushButton(button);
        res.status(200).json("ok");
    });
    

    return apiRouter;
}

module.exports = api;