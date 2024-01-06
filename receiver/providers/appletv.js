/* eslint-disable class-methods-use-this */
class AppleTV {
  provides(uri) {
    return uri.includes('tv.apple.com');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.apple.atve.androidtv.appletv/.MainActivity';
  }
}
module.exports = AppleTV;
