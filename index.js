const axios = require('axios');
const http = require('http');
const JustWatch = require('justwatch-api');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const Sequelize = require('sequelize');
const passport = require('passport');
const TraktStrategy = require('passport-trakt').Strategy;
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv')
dotenv.config();
const db = require('./models');
const { monitorEventLoopDelay } = require('perf_hooks');

const clientId = process.env['TRAKT_CLIENT_ID'];
const clientSecret = process.env['TRAKT_CLIENT_SECRET'];
const traktUsername = process.env['USERNAME'];
const oauthHost = process.env['OAUTH_HOST']; // This needs to match your Trakt app settings
const justwatch = new JustWatch({ locale: 'en_US' });
const port = process.env['PORT'];
const bindHost = process.env['BIND_HOST'];
const providerRaw = process.env['SUPPORTED_PROVIDERS']
const supportedProviders = providerRaw.split(',');

passport.serializeUser((user, next) => {
  next(null, user.trakt_id);
});
passport.deserializeUser((req, traktUserId, next) => {
  req.models.User.findOne({where: { trakt_id: traktUserId }}).then((user) => {
    next(null, user);
  }).catch((err) => next(err));
});

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
const sessionSettings = {
  secret: process.env['SESSION_SECRET'],
  resave: false,
  saveUninitialized: false,
  cookie: {},
  store: new SequelizeStore({
    db: db.sequelize,
    tableName: 'Sessions',
  }),
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sessionSettings.cookie.secure = true // serve secure cookies
}
app.use(session(sessionSettings));
app.use(function sequelizeDecorator(req, res, next) {
    if (!req.models) {
      req.models = db;
    }
    if (!req.sequelize) {
      req.sequelize = db.sequelize;
    }
    next();
});
app.use(passport.initialize());
app.use(passport.session());
passport.use(new TraktStrategy({
  clientID: clientId,
  clientSecret: clientSecret,
  callbackURL: `${oauthHost}/api/auth/trakt/callback`,
},
async function(accessToken, refreshToken, params, profile, done) {
    let user = await db.User.findOne({where: { trakt_id: profile.id }});
    if (!user) {
      user = await db.User.create({
        trakt_id: profile.id,
        name: profile._json.name,
        username: profile.username,
        private: profile._json.private,
        vip: profile._json.vip,
        vip_ep: profile._json.vip_ep,
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else {
      user = await user.update({access_token: accessToken, refresh_token: refreshToken});
    }
    console.log(accessToken);
    console.log(refreshToken);
    console.log(user);

    return done(null, user);
}
));

const requireLogin = (req, res, next) => {
  if (req.user) {
    next();
    return;
  }
  res.status(401).send("Unauthorized");
  next("Unauthorized");
}

app.use(express.static('./frontend/build/'));

const apiRouter = new express.Router();

apiRouter.get('/login', function(req, res){
  res.redirect('/api/auth/trakt');
  // res.redirect(`https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`);
});

apiRouter.get('/auth/trakt',
  passport.authenticate('trakt'),
  function(req, res){
    // The request will be redirected to Trakt for authentication, so this
    // function will not be called.
  });

  apiRouter.get('/auth/trakt/callback', 
  passport.authenticate('trakt', { failureRedirect: '/api/login' }),
  function(req, res) {
    if (req.session.returnTo) {
      res.redirect(req.session.returnTo);
      return;
    }
    // go somewhere bogus
    res.redirect('/');
  });

  apiRouter.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});  


apiRouter.get('/watchlist', requireLogin, async (req, res, next) => {
  try {
    const items = await getTraktWatchlist(req.user);
    // console.log(items);
    res.json(items);
  } catch(e) {
    console.log(e);
    if (e.response && e.response.status) {
      res.status(e.response.status).json(e);
      return;
    }
    res.status(500).json(e);
    
  }
});
app.use("/api", apiRouter);

app.listen(port, bindHost, () => {
  console.log(`API listening at http://${bindHost}:${port}`);
});

// const server = http.createServer((req, res) => {
//   if (req.url.startsWith('/callback')) {
//     const authorizationCode = new URL(req.url, `http://localhost:${apiPort}`).searchParams.get('code');
//     res.write('Authorization code received. You can close this window.');
//     res.end();

//     // Use the authorization code to request an access token and a refresh token
//     axios.post('https://api.trakt.tv/oauth/token', {
//       code: authorizationCode,
//       client_id: clientId,
//       client_secret: clientSecret,
//       redirect_uri: redirectUri,
//       grant_type: 'authorization_code',
//     })
//       .then(async (response) => {
//         const { access_token: accessToken } = response.data;
//         const watchlistMovies = await getTraktWatchlistMovies(accessToken);
//         const watchlistShows = await getTraktWatchlistShows(accessToken);
//         checkStreamingAvailabilityAndOutputResults(watchlistMovies, watchlistShows);
//         server.close();
//       })
//       .catch((error) => {
//         console.error('Error obtaining access token:', error.message);
//         server.close();
//       });
//   } else {
//     res.write('Please visit the Trakt.tv authorization URL to grant access.');
//     res.end();
//   }
// });

// server.listen(port, bindHost, () => {
//   console.log(`Server running at http://${bindHost}:${port}/`);
//   console.log('Please visit the following URL to authorize the application:');
//   console.log(`https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`);
// });

// async function getTraktWatchlistMovies(accessToken) {
//   const response = await axios.get(`https://api.trakt.tv/users/${traktUsername}/watchlist/movies`, {
//     headers: {
//       'Content-Type': 'application/json',
//       'trakt-api-version': '2',
//       'trakt-api-key': clientId,
//       'Authorization': `Bearer ${accessToken}`,
//     },
//   });

//   return response.data;
// }

async function getTraktWatchlist(user) {
  const response = await axios.get(`https://api.trakt.tv/users/${user.trakt_id}/lists/tv-we-re-watching/items/`, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': clientId,
      'Authorization': `Bearer ${user.access_token}`,
    },
  });
  // console.log(response.data);
  await addJustWatchData(response.data);

  return response.data;
}

async function addJustWatchData(items) {
  // so I think we should cache this information and then another lookup when you want to watch
  var tasks = [];
  for (let i = 0; i < items.length; i++) {
    var title = items[i].type === "show" ? items[i].show.title : items[i].movie.title;
    tasks[i] = justwatch.search({ query: title, content_types: [items[i].type], providers: ['amc_plus'] });
  }
  // const providers = await justwatch.getProviders();
  // const providerShortName = ["peacock_premium"];
  // for (i = 0; i < providers.length; i++) {
  //   if (String(providers[i].clear_name).includes("Apple")) {
  //     console.log(providers[i]);
  //   }
  // }
  // console.log(providers);

  const results = await Promise.all(tasks);
  // console.log(results);
  for (let i = 0; i < results.length; i++) {
    var resultItems = results[i].items;
    for(let j = 0; j < resultItems.length; j++) {
      var resultItem = resultItems[j];
      var type = items[i].type;

      if (resultItem.title === title) {
        items[i].providers = [];
        items[i].deeplink_android_tv = [];
        resultItem.offers?.forEach((offer) => {
          if (supportedProviders.indexOf(String(offer.provider_id)) > -1) {
            items[i].providers.push(offer.provider_id);
            items[i].deeplink_android_tv.push(offer.urls.deeplink_android_tv);
          }
        });

        items[i].image = resultItem.poster ? `https://images.justwatch.com${resultItem.poster.replace('{profile}', 's592')}` : '';

        const urlType = type === 'movie' ? 'movie' : 'tv-show';
        const titleNoApostraphe = title.replace(/[']/g, '');
        const titleCleaned = titleNoApostraphe.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        items[i].url = `https://www.justwatch.com/us/${urlType}/${titleCleaned}`;
      }
    }
    // console.log(items[i]);
  }
  
//   const searchResults = await justwatch.search({ query: title, content_types: [type] });

//   return searchResults.items.reduce((results, item) => {
//     if (item.title === title) {
//       item.offers?.forEach((offer) => {
//         if (offer.provider_id === 8 || offer.provider_id === 9) {
//           results.providers.add(offer.provider_id);
//         }
//       });

// 			results.image = item.poster ? `https://images.justwatch.com${item.poster.replace('{profile}', 's592')}` : '';

// 			const urlType = type === 'movie' ? 'movie' : 'tv-show';
// 			const titleNoApostraphe = title.replace(/[']/g, '');
// 			const titleCleaned = titleNoApostraphe.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
// 			results.url = `https://www.justwatch.com/us/${urlType}/${titleCleaned}`;
//     }
//     return results;
//   }, { providers: new Set(), image: null, url: null });
}

// async function checkStreamingAvailability(title, type) {
//   const searchResults = await justwatch.search({ query: title, content_types: [type] });

//   return searchResults.items.reduce((results, item) => {
//     if (item.title === title) {
//       item.offers?.forEach((offer) => {
//         if (offer.provider_id === 8 || offer.provider_id === 9) {
//           results.providers.add(offer.provider_id);
//         }
//       });

// 			results.image = item.poster ? `https://images.justwatch.com${item.poster.replace('{profile}', 's592')}` : '';

// 			const urlType = type === 'movie' ? 'movie' : 'tv-show';
// 			const titleNoApostraphe = title.replace(/[']/g, '');
// 			const titleCleaned = titleNoApostraphe.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
// 			results.url = `https://www.justwatch.com/us/${urlType}/${titleCleaned}`;
//     }
//     return results;
//   }, { providers: new Set(), image: null, url: null });
// }

// async function checkStreamingAvailabilityAndOutputResults(watchlistMovies, watchlistShows) {
//   const netflixMovies = [];
//   const netflixShows = [];
//   const primeVideoMovies = [];
//   const primeVideoShows = [];

//   await Promise.all(watchlistMovies.map(async (movie) => {
//     try {
//       const availableProviders = await checkStreamingAvailability(movie.movie.title, 'movie');
//       if (availableProviders.providers.has(8)) {
// 				netflixMovies.push({ title: movie.movie.title, image: availableProviders.image, url: availableProviders.url });
//       } else if (availableProviders.providers.has(9)) {
// 				primeVideoMovies.push({ title: movie.movie.title, image: availableProviders.image, url: availableProviders.url });
//       }
//     } catch (error) {
//       console.error(`Error checking streaming availability for movie "${movie.movie.title}":`, error.message);
//     }
//   }));

//   await Promise.all(watchlistShows.map(async (show) => {
//     try {
//       const availableProviders = await checkStreamingAvailability(show.show.title, 'show');
//       if (availableProviders.providers.has(8)) {
// 				netflixShows.push({ title: show.show.title, image: availableProviders.image, url: availableProviders.url });
//       } else if (availableProviders.providers.has(9)) {
// 				primeVideoShows.push({ title: show.show.title, image: availableProviders.image, url: availableProviders.url });
//       }
//     } catch (error) {
//       console.error(`Error checking streaming availability for show "${show.show.title}":`, error.message);
//     }
//   }));

//   const watchlistData = {
//     netflixMovies: netflixMovies.map(({ title, image, url }) => ({ title, image, url })),
//     netflixShows: netflixShows.map(({ title, image, url }) => ({ title, image, url })),
//     primeVideoMovies: primeVideoMovies.map(({ title, image, url }) => ({ title, image, url })),
//     primeVideoShows: primeVideoShows.map(({ title, image, url }) => ({ title, image, url })),
//   };

// 	fs.writeFile('watchlistData.json', JSON.stringify(watchlistData, null, 2), (err) => {
//     if (err) {
//       console.error('Error saving watchlist data:', err);
//     } else {
//       console.log('** Watchlist data saved to watchlistData.json **');
//     }
//   });
// }