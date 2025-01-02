/* eslint-disable class-methods-use-this */
class PBS {
  provides(uri) {
    // this probably no longer works
    return uri.includes('www.pbs.org');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.pbs.video/com.pbs.video.deeplinks.DeepLinkActivity';
  }
}
module.exports = PBS;
