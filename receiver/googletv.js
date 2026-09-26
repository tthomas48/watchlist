const debug = require('debug')('watchlist:receiver:androidtv');
const ProviderFactory = require('./providers/factory');
const { unsupportedStreamingUrlError } = require('./unsupported_streaming_url');

class GoogleTV {
  async init() {
    // NOOP;
  }

  async disconnect() {
    // NOOP;
  }

  async play(uri) {
    debug(`Getting params for ${uri}`);
    const params = ProviderFactory.getParams(uri);
    if (params == null) {
      throw unsupportedStreamingUrlError(uri);
    }
    params.result = true;
    debug(`Returning params ${JSON.stringify(params)}`);
    return params;
  }

  async pushButton() {
    // NOOP;
  }
}
module.exports = new GoogleTV();
