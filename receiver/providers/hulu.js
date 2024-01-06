/* eslint-disable class-methods-use-this */
class Hulu {
  provides(uri) {
    return uri.includes('package=com.hulu.livingroomplus') || uri.includes('www.hulu.com');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.hulu.livingroomplus/.WKFactivity';
  }
}
module.exports = Hulu;
