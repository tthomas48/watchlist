/* eslint no-underscore-dangle: 0 */
const dotenv = require('dotenv');
dotenv.config();

const debug = require('debug')('watchlist:routes');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const TraktOauthProvider = require('./api/auth/trakt_oauth_provider');
const receiverFactory = require('./receiver/factory');

const db = require('./models');
const api = require('./api/api');

class Api {
  init(app) {
    this.port = process.env.PORT;
    this.bindHost = process.env.BIND_HOST;

    app.use(cors());
    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    const sessionSettings = {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: 'auto' },
      store: new SequelizeStore({
        db: db.sequelize,
        tableName: 'Sessions',
      }),
    };

    if (app.get('env') === 'production') {
      app.set('trust proxy', 1); // trust first proxy
      sessionSettings.cookie.secure = true; // serve secure cookies
    }
    app.use(session(sessionSettings));
    app.use((req, res, next) => {
      if (!req.models) {
        req.models = db;
      }
      if (!req.sequelize) {
        req.sequelize = db.sequelize;
      }
      next();
    });
    TraktOauthProvider.configure(app, db);

    const settingsPromise = db.Settings.findOne();
    settingsPromise.then((settings) => {
      receiverFactory.init(settings);
    });

    app.use('/api', api(TraktOauthProvider, receiverFactory));

    if (process.env.REACT_DEV_SERVER === 'true') {
      // setup a proxy in express for everything to this:
      // change port here to be an available port
      // wire up the proxy, and this will ensure that we start the dev server

      // I want to startup the react dev server from react-app-rewired
      // set the react port somewhere in here.
      // this.port = 9981;
      (async () => {
        require('react-app-rewired/scripts/start');
      })();
    }

    // app.listen(port, bindHost, () => {
    //   debug(`API listening at http://${bindHost}:${port}`);
    // });
  }

  listen(app) {
    app.use(express.static(path.resolve(`${__dirname}/build/`)));
    app.get('/*', (req, res) => {
      res.sendFile(path.resolve(`${__dirname}/build/index.html`));
    });
    app.listen(this.port, this.bindHost, () => {
      debug(`API listening at http://${this.bindHost}:${this.port}`);
    });
  }
}
module.exports = new Api();
