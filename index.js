const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const passport = require('passport');
const TraktStrategy = require('passport-trakt').Strategy;
const dotenv = require('dotenv')
dotenv.config();
const db = require('./models');
const api = require('./api/api');

const clientId = process.env['TRAKT_CLIENT_ID'];
const clientSecret = process.env['TRAKT_CLIENT_SECRET'];
const oauthHost = process.env['OAUTH_HOST']; // This needs to match your Trakt app settings

const port = process.env['PORT'];
const bindHost = process.env['BIND_HOST'];

passport.serializeUser((user, next) => {
  next(null, user.trakt_id);
});
passport.deserializeUser((req, traktUserId, next) => {
  req.models.User.findOne({ where: { trakt_id: traktUserId } }).then((user) => {
    next(null, user);
  }).catch((err) => next(err));
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
const sessionSettings = {
  secret: process.env['SESSION_SECRET'],
  resave: false,
  saveUninitialized: false,
  cookie: { secure: 'auto' },
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
  async function (accessToken, refreshToken, params, profile, done) {
    let user = await db.User.findOne({ where: { trakt_id: profile.id } });
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
      user = await user.update({ access_token: accessToken, refresh_token: refreshToken });
    }
    return done(null, user);
  }
));

const settingsPromise = db.Settings.findOne();

app.use(express.static('./frontend/build/'));
app.use("/api", api(clientId, passport, settingsPromise));
app.get('/*', (req, res) => {
  res.sendFile(__dirname + '/frontend/build/index.html');
})

app.listen(port, bindHost, () => {
  console.log(`API listening at http://${bindHost}:${port}`);
});
