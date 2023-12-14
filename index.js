/* eslint no-underscore-dangle: 0 */
const debug = require('debug')('watchlist');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const dotenv = require('dotenv');
const TraktOauthProvider = require('./api/auth/trakt_oauth_provider');
const receiverFactory = require('./receiver/factory');

dotenv.config();
const db = require('./models');
const api = require('./api/api');

const port = process.env.PORT;
const bindHost = process.env.BIND_HOST;

const app = express();
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

app.use(express.static('./build/'));
app.use('/api', api(TraktOauthProvider, receiverFactory));
app.get('/*', (req, res) => {
  res.sendFile(`${__dirname}/frontend/build/index.html`);
});

app.listen(port, bindHost, () => {
  debug(`API listening at http://${bindHost}:${port}`);
});
