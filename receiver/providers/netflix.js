/* eslint-disable class-methods-use-this */
class Netflix {
  provides(uri) {
    return uri.includes('www.netflix.com/');
  }

  getData(uri) {
    let id = '';
    if (uri.match(/.*\/title\/([0-9]+)/)) {
      // id = uri.replace(/.*\/title\/([0-9]+)/, "$1");
      return uri;
    }
    if (uri.match(/.*\/browse\?jbv=([0-9]+)/)) {
      id = uri.replace(/.*\/browse\?jbv=([0-9]+)/, '$1');
      return `https://www.netflix.com/title/${id}`;
    }
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.netflix.ninja/.MainActivity';
  }
}
module.exports = Netflix;
