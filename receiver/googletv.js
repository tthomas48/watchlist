const debug = require('debug')('watchlist:receiver:androidtv');
const ProviderFactory = require('./providers/factory');

class GoogleTV {
  async init() {
    // NOOP;
  }

  async disconnect() {
    // NOOP;
  }

  async play(uri) {
    const params = ProviderFactory.getParams(uri);
    params.result = true;
    debug(`Params: ${JSON.stringify(params)}`);
    return params;
  }

  async pushButton() {
    // NOOP;
  }
}
module.exports = new GoogleTV();
