const debug = require('debug')('watchlist:receiver:adb');
const Sentry = require('@sentry/node');
const ADB = require('@devicefarmer/adbkit');
const ProviderFactory = require('./providers/factory');

class Adb {
  async init(settings) {
    try {
      if (!settings || !settings.googletv_host || !settings.googletv_port) {
        return;
      }
      debug(`Initializing adb with device at ${settings.googletv_host}:${settings.googletv_port}`);
      this.client = ADB.Adb.createClient();
      this.host = settings.googletv_host;
      this.port = settings.googletv_port;

      this.remoteID = await this.client.connect(this.host, this.port);
      debug(`Remote id ${this.remoteID}`);
    } catch (e) {
      debug(e);
    }
  }

  async disconnect() {
    if (this.host && this.port) {
      await this.client.disconnect(this.host, this.port);
    }
    this.remoteID = null;
  }

  verifyConnected() {
    if (!this.remoteID) {
      throw new Error('Not connected');
    }
  }

  async goHome() {
    this.verifyConnected();
    const device = this.client.getDevice(this.remoteID);

    const cmd = 'am start -a android.intent.action.MAIN -c android.intent.category.HOME';
    const result = await device.shell(cmd);
    debug(result);
  }

  async play(uri, attempt = 0) {
    try {
      this.verifyConnected();
      await this.goHome();
      debug(`Playing ${uri}`);
      Sentry.captureMessage(`Playing ${uri}`);
      const device = this.client.getDevice(this.remoteID);
      // I used to use device.startActivity, but couldn't make it work consistenly
      const cmd = ProviderFactory.getCommand(uri);
      debug(`Cmd: ${cmd}`);
      Sentry.captureMessage(`Cmd: ${cmd}`);
      const result = await device.shell(cmd);
      const output = await ADB.Adb.util.readAll(result);
      debug(output.toString().trim());
      return { result: true, output };
    } catch (e) {
      debug(e);
      if (attempt === 0 && String(e).includes('not found')) {
        return this.play(uri, 1);
      }
      throw e;
    }
  }

  async pushButton(button) {
    let keyEvent = '';
    switch (button) {
      case 'up':
        keyEvent = 'DPAD_UP';
        break;
      case 'down':
        keyEvent = 'DPAD_DOWN';
        break;
      case 'left':
        keyEvent = 'DPAD_LEFT';
        break;
      case 'right':
        keyEvent = 'DPAD_RIGHT';
        break;
      case 'enter':
        keyEvent = 'ENTER';
        break;
      case 'home':
        keyEvent = 'HOME';
        break;
      case 'back':
        keyEvent = 'BACK';
        break;
      default:
        debug(`unknown button ${button}`);
    }
    if (keyEvent === '') {
      return;
    }

    debug(`pushing button ${keyEvent}`);
    this.verifyConnected();
    const device = this.client.getDevice(this.remoteID);
    await device.shell(`input keyevent ${keyEvent}`);
  }
}
module.exports = new Adb();
