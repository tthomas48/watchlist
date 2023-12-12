class AppleTV {
  static provides(uri) {
    return uri.includes('tv.apple.com');
  }

  static getData(uri) {
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.apple.atve.androidtv.appletv/.MainActivity';
  }
}
export default AppleTV;
