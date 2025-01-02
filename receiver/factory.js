const debug = require('debug')('watchlist:receiver:factory');
const adb = require('./adb');
const googletv = require('./googletv');
const redirect = require('./redirect');
const ProviderFactory = require('./providers/factory');

class ReceiverFactory {
  constructor() {
    this.receivers = {
      adb,
      googletv,
      redirect,
    };
  }

  async init(settings) {
    const tasks = [];
    Object.keys(this.receivers).forEach((key) => {
      tasks.push(this.receivers[key].init(settings));
    });
    return Promise.all(tasks);
  }

  async updateReceiver(settings, key) {
    try {
      debug(`Running update for ${key}`);
      await this.receivers[key].disconnect();
      await this.receivers[key].init(settings);
    } catch (e) {
      debug(e);
    }
  }

  async update(settings) {
    const tasks = [];
    Object.keys(this.receivers).forEach((key) => {
      tasks.push(this.updateReceiver(settings, key));
    });
    return Promise.all(tasks);
  }

  getReceiver(name) {
    switch (name) {
      case 'adb-googletv':
        return this.receivers.adb;
      case 'device-googletv':
        return this.receivers.googletv;
      default:
        return this.receivers.redirect;
    }
  }

  getStreamingUrl(homepageUrl) {
    return ProviderFactory.getStreamingUrl(homepageUrl);
  }
}
module.exports = new ReceiverFactory();
