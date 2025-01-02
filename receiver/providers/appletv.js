/* eslint-disable class-methods-use-this */
class AppleTV {
  provides(uri) {
    return uri.includes('tv.apple.com');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.apple.atve.androidtv.appletv/.MainActivity';
  }
}
module.exports = AppleTV;
