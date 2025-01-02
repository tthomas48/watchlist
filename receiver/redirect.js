/* eslint-disable class-methods-use-this, no-unused-vars */
const ProviderFactory = require('./providers/factory');

class Redirect {
  async init(settings) {
    // NOOP;
  }

  async disconnect() {
    // NOOP;
  }

  async play(uri) {
    // NOOP - happens on the frontend
    return { result: true, output: '' };
  }

  async pushButton(button) {
    // NOOP;
  }
}
module.exports = new Redirect();
