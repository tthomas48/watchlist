const debug = require('debug')('watchlist:receiver:androidtv');
const Sentry = require('@sentry/node');
const ProviderFactory = require('./providers/factory');

class GoogleTV {
  async init() {
    // NOOP;
  }

  async disconnect() {
    // NOOP;
  }

  async play(uri) {
    Sentry.captureMessage(`Getting params for ${uri}`);
    const params = ProviderFactory.getParams(uri);
    params.result = true;
    Sentry.captureMessage(`Returning params ${JSON.stringify(params)}`);
    debug(`Params: ${JSON.stringify(params)}`);
    return params;
  }

  async pushButton() {
    // NOOP;
  }
}
module.exports = new GoogleTV();
