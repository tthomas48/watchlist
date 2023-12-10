/* eslint-disable class-methods-use-this, no-unused-vars */
class Redirect {
  async init(settings) {
    // NOOP;
  }

  async disconnect() {
    // NOOP;
  }

  async play(uri) {
    // NOOP - happens on the frontend
    return true;
  }

  async pushButton(button) {
    // NOOP;
  }
}
module.exports = new Redirect();
