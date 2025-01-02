/* eslint-disable class-methods-use-this */
class Max {
  provides(uri) {
    return uri.includes('play.max.com') || uri.includes('www.max.com');
  }

  getStreamingUrl(homepageUrl) {
    if (homepageUrl.includes('www.max.com/shows/')) {
      return homepageUrl.replace(/http:\/\/www.max.com.*\/([0-9a-f-]+)/, 'https://play.max.com/show/$1');
    }
    return homepageUrl.replace('http://', 'https://').replace('www.max.com', 'play.max.com');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.wbd.stream/com.wbd.beam.BeamActivity';
  }
}
module.exports = Max;
