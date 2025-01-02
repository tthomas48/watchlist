/* eslint-disable class-methods-use-this */
class Netflix {
  provides(uri) {
    return uri.includes('www.netflix.com/');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    if (uri.match(/.*jbv=([0-9]+).*/)) {
      const id = uri.replace(/.*jbv=([0-9]+).*/, '$1');
      return `https://www.netflix.com/title/${id}`;
    }
    if (uri.match(/.*\/title\/([0-9]+)/)) {
      const urlObj = new URL(uri);
      urlObj.search = '';
      return urlObj.toString();
    }
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.netflix.ninja/.MainActivity';
  }
}
module.exports = Netflix;
