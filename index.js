const debug = require('debug')('watchlist:proxy');
const express = require('express');
const Sentry = require('@sentry/node');
const Server = require('./server');

let useSentry = false;
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  useSentry = true;
}

// so it's host and port
if (process.env.REACT_DEV_SERVER === 'true') {
  // setup a proxy in express for everything to this:
  // change port here to be an available port
  // wire up the proxy, and this will ensure that we start the dev server

  // I want to startup the react dev server from react-app-rewired
  // set the react port somewhere in here.
  (async () => {
    let remoteUrl = `http://${process.env.HOST}:${process.env.PORT}`;
    if (process.env.TUNNEL === 'true') {
      // eslint-disable-next-line import/no-extraneous-dependencies, global-require
      const ngrok = require('@ngrok/ngrok');
      const listener = await ngrok.forward({
        addr: process.env.PORT,
        authtoken_from_env: true,
        domain: process.env.NGROK_DOMAIN,
      });

      // Output ngrok url to console
      remoteUrl = listener.url();
      process.env.PUBLIC_URL = remoteUrl;
    }
    // eslint-disable-next-line global-require
    require('react-app-rewired/scripts/start');
    debug(`Your app will be hosted at ${remoteUrl}`);
  })();
} else {
  const app = express();
  const server = new Server();
  server.init(app);
  if (useSentry) {
    Sentry.setupExpressErrorHandler(app);
  }
  server.listen(app);
}
