/* eslint-disable class-methods-use-this */
class Netflix {
  provides(uri) {
    return uri.includes('www.netflix.com/');
  }

  getData(uri) {
    if (uri.match(/.*jbv=([0-9]+).*/)) {
      return uri.replace(/.*jbv=([0-9]+).*/, '$1');
    }
    if (uri.match(/.*\/title\/([0-9]+)/)) {
      return uri.replace(/.*\/title\/([0-9]+).*/, '$1');
    }
    throw new Error(`Unknown Netflix uri format ${uri}`);
  }

  getComponent(/* uri */) {
    return 'com.netflix.ninja/.MainActivity';
  }
}
module.exports = Netflix;
