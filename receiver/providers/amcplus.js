/* eslint-disable class-methods-use-this */
class AMCPlus {
  provides(uri) {
    return uri.includes('www.amcplus.com');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    return uri.replace(/.*-([0-9]+)/, '$1');
  }

  getComponent(/* uri */) {
    return 'com.amcplus.amcandroidtv/com.amcplus.tv.MainActivity';
  }
}
module.exports = AMCPlus;
