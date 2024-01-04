const express = require('express');
const api = require('./routes');
const debug = require('debug')('watchlist:proxy');

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
    require('react-app-rewired/scripts/start');
    debug(`Your app will be hosted at ${remoteUrl}`);
  })();
} else {
  const app = express();
  api.init(app);
  api.listen(app);
}
