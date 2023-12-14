const passport = require('passport');
const TraktStrategy = require('passport-trakt').Strategy;

class TraktOauthProvider {
  constructor() {

  }

  getClientId() {
    return this.clientId;
  }

  configure(app, db) {
    this.clientId = process.env.TRAKT_CLIENT_ID;
    const clientSecret = process.env.TRAKT_CLIENT_SECRET;
    const oauthHost = process.env.OAUTH_HOST; // This needs to match your Trakt app settings

    passport.serializeUser((user, next) => {
      next(null, user.trakt_id);
    });
    passport.deserializeUser((req, traktUserId, next) => {
      req.models.User.findOne({ where: { trakt_id: traktUserId } }).then((user) => {
        next(null, user);
      }).catch((err) => next(err));
    });

    app.use(passport.initialize());
    app.use(passport.session());
    passport.use(new TraktStrategy(
      {
        clientID: this.clientId,
        clientSecret,
        callbackURL: `${oauthHost}/api/auth/trakt/callback`,
      },
      (async (accessToken, refreshToken, params, profile, done) => {
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
      }),
    ));
  }

  addRoutes(apiRouter) {
    apiRouter.get('/login', (req, res) => {
      res.redirect('/api/auth/trakt');
    });

    apiRouter.get(
      '/auth/trakt',
      passport.authenticate('trakt'),
      () => {
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
  }
}
module.exports = new TraktOauthProvider();
