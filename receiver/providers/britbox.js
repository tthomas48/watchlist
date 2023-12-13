class BritBox {
  static provides(uri) {
    // this probably no longer works
    return uri.includes('component=com.britbox.us');
  }

  static getData(uri) {
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.britbox.tv/axis.androidtv.sdk.app.MainActivity';
  }
}
module.exports = BritBox;
