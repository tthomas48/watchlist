class Hulu {
  static provides(uri) {
    return uri.includes('package=com.hulu.livingroomplus') || uri.includes('www.hulu.com');
  }

  static getData(uri) {
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.hulu.livingroomplus/.WKFactivity';
  }
}
module.exports = Hulu;
