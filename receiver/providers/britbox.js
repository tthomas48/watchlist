/* eslint-disable class-methods-use-this */
class BritBox {
  provides(uri) {
    // this probably no longer works
    return uri.includes('component=com.britbox.us');
  }

  getStreamingUrl(homepageUrl) {
    return '';
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.britbox.tv/axis.androidtv.sdk.app.MainActivity';
  }
}
module.exports = BritBox;
