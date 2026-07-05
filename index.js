require('./instrument');

const debug = require('debug')('watchlist:proxy');
const express = require('express');
const { Sentry, useSentry } = require('./instrument');
const Server = require('./server');

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

    remoteUrl = listener.url();
    debug(`Your app will be hosted at ${remoteUrl}`);
  }
})();

const app = express();
const server = new Server();
server.init(app);
if (useSentry) {
  Sentry.setupExpressErrorHandler(app);
}
server.listen(app);
