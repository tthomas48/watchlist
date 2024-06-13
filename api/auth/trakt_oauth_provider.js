const passport = require('passport');
const TraktStrategy = require('passport-trakt').Strategy;
const AccessTokenStrategy = require('passport-access-token').Strategy;
const TraktClient = require('../traktclient');
const ErrorWithStatus = require('../../ErrorWithStatus');

class TraktOauthProvider {
  getClientId() {
    return this.clientId;
  }

  configure(app, db) {
    this.clientId = process.env.TRAKT_CLIENT_ID;
    this.traktClient = new TraktClient(this.clientId);
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
          // eslint-disable-next-line no-underscore-dangle
          const json = profile._json;
          user = await db.User.create({
            trakt_id: profile.id,
            name: json.name,
            username: profile.username,
            private: json.private,
            vip: json.vip,
            vip_ep: json.vip_ep,
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else {
          user = await user.update({ access_token: accessToken, refresh_token: refreshToken });
        }
        return done(null, user);
      }),
    ));
    passport.use(new AccessTokenStrategy({
      tokenField: 'token',
    }, async (token, done) => {
      if (!token) {
        return done(new ErrorWithStatus('no token specified', 401), null);
      }
      try {
        await this.traktClient.importToken(token);
        const profile = await this.traktClient.getProfile();
        let user = await db.User.findOne({ where: { trakt_id: profile.username } });
        if (!user) {
          user = await db.User.create({
            trakt_id: profile.username,
            name: profile.name,
            username: profile.username,
            private: profile.private,
            vip: profile.vip,
            vip_ep: profile.vip_ep,
            access_token: token,
          });
        } else {
          user = await user.update({ access_token: token });
        }
        return done(null, user);
      } catch (e) {
        return done(new ErrorWithStatus(e, 401));
      }
    }));
  }

  redirect(req, res) {
    res.redirect('/api/auth/trakt');
  }

  // eslint-disable-next-line class-methods-use-this
  callback(req, res) {
    if (req.session.returnTo) {
      res.redirect(req.session.returnTo);
      return;
    }
    // go somewhere bogus
    res.redirect('/');
  }

  requireLogin(req, res, next) {
    if (req.user) {
      next();
      return;
    }
    res.status(401).send('Unauthorized');
    next('Unauthorized');
  }

  addRoutes(apiRouter) {
    apiRouter.get('/login', this.redirect);

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
      this.callback,
    );

    apiRouter.post(
      '/auth/device',
      passport.authenticate('token', {
        session: true,
      }),
      (req, res) => {
        res.json();
      },
    );
  }
}
module.exports = TraktOauthProvider;
