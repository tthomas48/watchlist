class AMCPlus {
  static provides(uri) {
    return uri.includes('www.amcplus.com');
  }

  static getData(uri) {
    return uri.replace(/.*-([0-9]+)/, '$1');
  }

  static getComponent(/* uri */) {
    return 'com.amcplus.amcandroidtv/com.amcplus.tv.MainActivity';
  }
}
export default AMCPlus;
