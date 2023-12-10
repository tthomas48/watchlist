const adb = require('./adb');
const redirect = require('./redirect');

class ReceiverFactory {
  constructor() {
    this.receivers = {
      adb,
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

  async update(settings) {
    const tasks = [];
    Object.keys(this.receivers).forEach((key) => {
      tasks.push(async () => {
        await this.receivers[key].disconnect();
        await this.receivers[key].init(settings);
      });
    });
    return Promise.all(tasks);
  }

  getReceiver(name) {
    switch (name) {
      case 'googletv':
      case 'firetv':
        return this.receivers.adb;
      default:
        return this.receivers.redirect;
    }
  }
}
module.exports = new ReceiverFactory();
