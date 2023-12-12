const debug = require('debug')('watchlist:receiver:adb');
const ADB = require('@devicefarmer/adbkit');

class Adb {
  async init(settings) {
    try {
      if (!settings || !settings.googletv_host || !settings.googletv_port) {
        return;
      }
      this.client = ADB.Adb.createClient();
      this.host = settings.googletv_host;
      this.port = settings.googletv_port;

      this.remoteID = await this.client.connect(this.host, this.port);
    } catch (e) {
      debug(e);
    }
  }

  async disconnect() {
    if (this.host && this.port) {
      await this.client.disconnect(this.host, this.port);
    }
  }

  async goHome() {
    const device = this.client.getDevice(this.remoteID);

    const cmd = 'am start -a android.intent.action.MAIN -c android.intent.category.HOME';
    const result = await device.shell(cmd);
    debug(result);
  }

  async play(uri, attempt = 0) {
    try {
      await this.goHome();
      debug(`Playing ${uri}`);
      const data = this.getData(uri);
      debug(`Returned ${data}`);
      const device = this.client.getDevice(this.remoteID);
      const action = 'android.intent.action.VIEW';
      const component = this.getComponent(uri);
      // I used to use device.startActivity, but couldn't make it work consistenly
      const cmd = `am start -a ${action} -d ${data} -f 0x10808000 -e source 30 ${component}`;
      debug(`Cmd: ${cmd}`);
      const result = await device.shell(cmd);
      return result;
    } catch (e) {
      debug(e);
      if (attempt === 0 && String(e).includes('not found')) {
        return this.play(uri, 1);
      }
      throw e;
    }
  }

  static getData(uri) {
    if (uri.includes('www.amcplus.com')) {
      return uri.replace(/.*-([0-9]+)/, '$1');
    }
    if (uri.includes('www.netflix.com/')) {
      // https://www.netflix.com/browse?jbv=80986854
      let id = '';
      if (uri.match(/.*\/title\/([0-9]+)/)) {
        // id = uri.replace(/.*\/title\/([0-9]+)/, "$1");
        return uri;
      }
      if (uri.match(/.*\/browse\?jbv=([0-9]+)/)) {
        id = uri.replace(/.*\/browse\?jbv=([0-9]+)/, '$1');
        return `https://www.netflix.com/title/${id}`;
      }
      // return `"netflix://title/${id}"`;
    }
    if (uri.includes('https://www.peacocktv.com/watch/asset/tv/')) {
      const id = uri.replace(/https:\/\/www.peacocktv.com\/watch\/asset\/tv\/[^/]+\/([^/]+)/, '$1');
      const json = { providerSeriesId: id, type: 'SERIES', action: 'PDP' };
      return `https://www.peacocktv.com/deeplink?deeplinkData%3D${encodeURIComponent(JSON.stringify(json))}`;
    }
    if (uri.includes('https://www.peacocktv.com/watch/asset/movies/')) {
      const id = uri.replace(/https:\/\/www.peacocktv.com\/watch\/asset\/movies\/[^/]+\/([^/]+)/, '$1');
      const json = { pvid: id, type: 'PROGRAMME', action: 'PDP' };
      return `https://www.peacocktv.com/deeplink?deeplinkData%3D${encodeURIComponent(JSON.stringify(json))}`;
    }
    if (uri.includes('www.amazon.com/')) {
      // https://watch.amazon.com/detail?asin=B0BYWHZ2FR
      return uri.replace(/https:\/\/www.amazon.com\/gp\/video\/detail\/(.*?)\/.*/, 'https://watch.amazon.com/detail?asin=$1');
    }
    return uri;
  }

  static getComponent(uri) {
    if (String(uri).length === 0) {
      return null;
    }
    // detect compponent type
    if (uri.includes('tv.apple.com')) {
      return 'com.apple.atve.androidtv.appletv/.MainActivity';
    }
    if (uri.includes('www.netflix.com/')) {
      return 'com.netflix.ninja/.MainActivity';
    }
    if (uri.includes('www.peacocktv.com')) {
      return 'com.peacocktv.peacockandroid/com.peacock.peacocktv.GoogleMainActivity';
    }
    if (uri.includes('www.amcplus.com')) {
      return 'com.amcplus.amcandroidtv/com.amcplus.tv.MainActivity';
    }
    if (uri.includes('package=com.hulu.livingroomplus') || uri.includes('www.hulu.com')) {
      return 'com.hulu.livingroomplus/.WKFactivity';
    }
    if (uri.includes('intent://watch.amazon.com') || uri.includes('amazon.com')) {
      return 'com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity';
    }
    if (uri.includes('www.disneyplus.com')) {
      return 'com.disney.disneyplus/com.bamtechmedia.dominguez.main.MainActivity';
    }
    if (uri.includes('play.max.com')) {
      return 'com.wbd.stream/com.wbd.beam.BeamActivity';
    }
    if (uri.includes('component=com.britbox.us')) {
      return 'com.britbox.tv/axis.androidtv.sdk.app.MainActivity';
    }
    // FIXME: needs more details
    if (uri.includes('www.pbs.org')) {
      return 'com.pbs.video/.ui.main.activities.StartupActivity';
    }
    // FIXME: needs more details
    if (uri.includes('starz')) {
      return 'com.bydeluxe.d3.android.program.starz/com.starz.amznfiretv.SplashActivity';
    }
    return null;
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
    const device = this.client.getDevice(this.remoteID);
    await device.shell(`input keyevent ${keyEvent}`);
  }
}
module.exports = new Adb();
