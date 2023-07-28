const express = require('express');
const axios = require('axios');
const singleflight = require('node-singleflight')
const JustWatch = require('justwatch-api');
const providerFactory = require('../provider/factory');


const justwatch = new JustWatch({ locale: 'en_US' });
const providerRaw = process.env['SUPPORTED_PROVIDERS']
const supportedProviders = providerRaw.split(',');

providerFactory.init();

async function refresh(clientId, req, traktListId, existingWatchables) {
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

async function addJustWatchData(items) {
    // const providers = await justwatch.getProviders();
    // const appleproviders = providers.filter((provider) => provider.clear_name.startsWith('Amazon'));
    // console.log(appleproviders);

    // so I think we should cache this information and then another lookup when you want to watch
    var tasks = [];
    for (let i = 0; i < items.length; i++) {
        var title = getTitle(items[i]);
        tasks[i] = justwatch.search({ query: title, content_types: [items[i].type] });
    }

    const results = await Promise.all(tasks);
    // console.log(results);
    for (let i = 0; i < results.length; i++) {
        var title = getTitle(items[i]);
        var resultItems = results[i].items;
        for (let j = 0; j < resultItems.length; j++) {
            var resultItem = resultItems[j];
            var type = items[i].type;

            if (resultItem.title === title) {
                //console.log(resultItem);
                items[i].justwatch_id = resultItem.id;
                items[i].providers = [];
                items[i].deeplink_android_tv = [];
                items[i].deeplink_fire_tv = [];
                items[i].deeplink_web = [];
                resultItem.offers?.forEach((offer) => {
                    if (title === 'Lucky Hank') {
                        console.log(offer);
                    }
                    if (supportedProviders.indexOf(String(offer.provider_id)) > -1) {
                        //console.log(offer.urls);
                        items[i].providers.push(offer.provider_id);
                        items[i].deeplink_android_tv.push(offer.urls.deeplink_android_tv);
                        items[i].deeplink_fire_tv.push(offer.urls.deeplink_fire_tv);
                        items[i].deeplink_web.push(offer.urls.standard_web);
                    }
                });

                // console.log(items[i]);
                items[i].image = resultItem.poster ? `https://images.justwatch.com${resultItem.poster.replace('{profile}', 's592')}` : '';

                const urlType = type === 'movie' ? 'movie' : 'tv-show';
                const titleNoApostraphe = title.replace(/[']/g, '');
                const titleCleaned = titleNoApostraphe.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
                items[i].url = `https://www.justwatch.com/us/${urlType}/${titleCleaned}`;
            }
        }
    }
}

async function createWatchable(req, traktListId, watchable) {
    const props = {
        title: getTitle(watchable),
        trakt_id: getTraktId(watchable),
        tmdb_id: getTmdbId(watchable),
        trakt_list_id: traktListId,
        justwatch_id: watchable.justwatch_id,
        image: watchable.image,
        media_type: watchable.type,
        urls: [],
    };
    addUrls(req, props, watchable.deeplink_android_tv, 'android_tv');
    addUrls(req, props, watchable.deeplink_fire_tv, 'fire_tv');
    addUrls(req, props, watchable.deeplink_web, 'web');
    return await req.models.Watchable.create(props, { include: [{ model: req.models.WatchableUrl, as: 'urls' }] });
}

async function updateWatchable(req, traktItem, watchable) {
    const props = {
        urls: [],
    };
    addUrls(req, props, traktItem.deeplink_android_tv, 'android_tv');
    addUrls(req, props, traktItem.deeplink_fire_tv, 'fire_tv');
    addUrls(req, props, traktItem.deeplink_web, 'web');

    var newUrls = props.urls;
    var foundUrl = [];
    var urls = await watchable.getUrls();
    urls.forEach((url) => {
        // initialize all of our urls
        foundUrl[url.service_type + "." + url.url] = url;
    });

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

function addUrls(req, watchable, urls, serviceType) {
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
            select: i === 0,
        });
        i++;
    });
}


function api(clientId, passport) {
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
            await singleflight.Do(traktListId, async () => {
                console.log("Refreshing because " + mostRecentUpdate + " is more than a day ago");
                await refresh(clientId, req, traktListId, existingWatchables);
            });
        }
        existingWatchables = await req.models.Watchable.findAll({ where: { trakt_list_id: traktListId } });
        res.json(existingWatchables);
    });

    apiRouter.post('/play/:service_type/:id/', requireLogin, async (req, res) => {
        try {
            const id = req.params['id'];
            const serviceType = req.params['service_type'];
            let watchableUrlType = "web";
            if (serviceType == "googletv" || serviceType == "android") {
                watchableUrlType = "android_tv";
            }
            const watchable = await req.models.Watchable.findByPk(id);
            const urls = await watchable.getUrls();
            // console.log(urls);
            // console.log(watchableUrlType);
            const uris = urls.filter((url) => url.service_type === watchableUrlType);
            console.log(uris);
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
    return apiRouter;
}

module.exports = api;